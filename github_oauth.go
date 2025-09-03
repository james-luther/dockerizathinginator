package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/zalando/go-keyring"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

const (
	serviceName = "dockerizathinginator"
	tokenKey    = "github_oauth_token"
)

// GitHubOAuthService handles GitHub OAuth authentication
type GitHubOAuthService struct {
	config      *oauth2.Config
	state       string
	server      *http.Server
	tokenChan   chan *oauth2.Token
	ctx         context.Context
}

// GitHubTokenInfo contains token information and user details
type GitHubTokenInfo struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	Scope       string    `json:"scope"`
	ExpiresAt   time.Time `json:"expires_at,omitempty"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
}

// NewGitHubOAuthService creates a new GitHub OAuth service
func NewGitHubOAuthService(ctx context.Context) (*GitHubOAuthService, error) {
	// Load OAuth credentials from environment variables
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	
	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("GitHub OAuth credentials not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables")
	}

	// Generate secure random state
	stateBytes := make([]byte, 32)
	rand.Read(stateBytes)
	state := hex.EncodeToString(stateBytes)

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  "http://localhost:8080/callback",
		Scopes:       []string{"repo", "user:email"},
		Endpoint:     github.Endpoint,
	}

	return &GitHubOAuthService{
		config:    config,
		state:     state,
		tokenChan: make(chan *oauth2.Token, 1),
		ctx:       ctx,
	}, nil
}

// InitiateOAuth starts the OAuth flow
func (g *GitHubOAuthService) InitiateOAuth() (string, error) {
	// Start local callback server
	if err := g.startCallbackServer(); err != nil {
		return "", fmt.Errorf("failed to start callback server: %w", err)
	}

	// Generate authorization URL
	authURL := g.config.AuthCodeURL(g.state, oauth2.AccessTypeOnline)
	
	return authURL, nil
}

// startCallbackServer starts a local HTTP server to handle the OAuth callback
func (g *GitHubOAuthService) startCallbackServer() error {
	mux := http.NewServeMux()
	
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		// Verify state parameter
		if r.URL.Query().Get("state") != g.state {
			http.Error(w, "Invalid state parameter", http.StatusBadRequest)
			return
		}

		// Get authorization code
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "No authorization code", http.StatusBadRequest)
			return
		}

		// Exchange code for token
		token, err := g.config.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, fmt.Sprintf("Token exchange failed: %v", err), http.StatusInternalServerError)
			return
		}

		// Send token through channel
		select {
		case g.tokenChan <- token:
		default:
		}

		// Send success response
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Authorization Successful</title>
				<style>
					body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #1e1e2e; color: #cdd6f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
					.container { text-align: center; background: rgba(49, 50, 68, 0.3); backdrop-filter: blur(20px); border: 1px solid rgba(186, 194, 222, 0.1); border-radius: 1.5rem; padding: 3rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
					.success { color: #a6e3a1; font-size: 3rem; margin-bottom: 1rem; }
					h1 { color: #cdd6f4; margin-bottom: 1rem; }
					p { color: #bac2de; margin-bottom: 2rem; }
					.close-btn { background: linear-gradient(135deg, #cba6f7, #89b4fa); color: #1e1e2e; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="success">✅</div>
					<h1>Authorization Successful!</h1>
					<p>You can now close this window and return to Dockerizathinginator.</p>
					<button class="close-btn" onclick="window.close()">Close Window</button>
				</div>
				<script>
					setTimeout(() => {
						window.close();
					}, 3000);
				</script>
			</body>
			</html>
		`))
	})

	g.server = &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	go func() {
		if err := g.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Callback server error: %v\n", err)
		}
	}()

	return nil
}

// WaitForCallback waits for the OAuth callback with timeout
func (g *GitHubOAuthService) WaitForCallback(timeout time.Duration) (*oauth2.Token, error) {
	select {
	case token := <-g.tokenChan:
		g.stopCallbackServer()
		return token, nil
	case <-time.After(timeout):
		g.stopCallbackServer()
		return nil, fmt.Errorf("oauth callback timeout")
	}
}

// stopCallbackServer shuts down the callback server
func (g *GitHubOAuthService) stopCallbackServer() {
	if g.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		g.server.Shutdown(ctx)
	}
}

// GetUserInfo fetches user information using the access token
func (g *GitHubOAuthService) GetUserInfo(token *oauth2.Token) (*GitHubTokenInfo, error) {
	client := g.config.Client(context.Background(), token)
	
	// Get user information
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	var user struct {
		Login string `json:"login"`
		Email string `json:"email"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	// If email is not public, get it from emails endpoint
	if user.Email == "" {
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailResp.Body.Close()
			var emails []struct {
				Email   string `json:"email"`
				Primary bool   `json:"primary"`
			}
			if json.NewDecoder(emailResp.Body).Decode(&emails) == nil {
				for _, email := range emails {
					if email.Primary {
						user.Email = email.Email
						break
					}
				}
			}
		}
	}

	// Get OAuth app info to retrieve granted scopes
	var grantedScopes string
	appResp, err := client.Get("https://api.github.com/applications/grants")
	if err == nil {
		defer appResp.Body.Close()
		var grants []struct {
			Scopes []string `json:"scopes"`
			App    struct {
				ClientID string `json:"client_id"`
			} `json:"app"`
		}
		if json.NewDecoder(appResp.Body).Decode(&grants) == nil {
			for _, grant := range grants {
				if grant.App.ClientID == g.config.ClientID {
					grantedScopes = strings.Join(grant.Scopes, ",")
					break
				}
			}
		}
	}

	// If we couldn't get scopes from grants, use the configured scopes as fallback
	if grantedScopes == "" {
		grantedScopes = strings.Join(g.config.Scopes, ",")
	}

	tokenInfo := &GitHubTokenInfo{
		AccessToken: token.AccessToken,
		TokenType:   token.TokenType,
		Scope:       grantedScopes,
		Username:    user.Login,
		Email:       user.Email,
	}

	if !token.Expiry.IsZero() {
		tokenInfo.ExpiresAt = token.Expiry
	}

	return tokenInfo, nil
}

// SaveToken securely stores the token in the system keyring
func (g *GitHubOAuthService) SaveToken(tokenInfo *GitHubTokenInfo) error {
	tokenData, err := json.Marshal(tokenInfo)
	if err != nil {
		return fmt.Errorf("failed to marshal token: %w", err)
	}

	err = keyring.Set(serviceName, tokenKey, string(tokenData))
	if err != nil {
		return fmt.Errorf("failed to store token in keyring: %w", err)
	}

	return nil
}

// LoadToken retrieves the stored token from the system keyring
func (g *GitHubOAuthService) LoadToken() (*GitHubTokenInfo, error) {
	tokenData, err := keyring.Get(serviceName, tokenKey)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve token from keyring: %w", err)
	}

	var tokenInfo GitHubTokenInfo
	err = json.Unmarshal([]byte(tokenData), &tokenInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal token: %w", err)
	}

	return &tokenInfo, nil
}

// DeleteToken removes the token from the system keyring
func (g *GitHubOAuthService) DeleteToken() error {
	err := keyring.Delete(serviceName, tokenKey)
	if err != nil {
		return fmt.Errorf("failed to delete token from keyring: %w", err)
	}
	return nil
}

// ValidateToken checks if the stored token is still valid
func (g *GitHubOAuthService) ValidateToken(tokenInfo *GitHubTokenInfo) error {
	token := &oauth2.Token{
		AccessToken: tokenInfo.AccessToken,
		TokenType:   tokenInfo.TokenType,
	}
	
	if !tokenInfo.ExpiresAt.IsZero() {
		token.Expiry = tokenInfo.ExpiresAt
	}

	client := g.config.Client(context.Background(), token)
	
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return fmt.Errorf("token validation failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("token validation failed with status: %d", resp.StatusCode)
	}

	return nil
}