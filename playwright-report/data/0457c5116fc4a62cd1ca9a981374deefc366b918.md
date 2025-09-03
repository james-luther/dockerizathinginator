# Page snapshot

```yaml
- generic [active]:
  - generic [ref=e2]:
    - generic [ref=e3] [cursor=pointer]:
      - img [ref=e4] [cursor=pointer]
      - generic [ref=e6] [cursor=pointer]: Connection Setup
    - generic [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
      - generic [ref=e10] [cursor=pointer]: Select Containers
    - generic [ref=e11] [cursor=pointer]:
      - img [ref=e12] [cursor=pointer]
      - generic [ref=e14] [cursor=pointer]: Volume Config
    - generic [ref=e15] [cursor=pointer]:
      - img [ref=e16] [cursor=pointer]
      - generic [ref=e18] [cursor=pointer]: Logging Options
    - generic [ref=e19] [cursor=pointer]:
      - img [ref=e20] [cursor=pointer]
      - generic [ref=e22] [cursor=pointer]: Cloud Backup
    - generic [ref=e23] [cursor=pointer]:
      - img [ref=e24] [cursor=pointer]
      - generic [ref=e26] [cursor=pointer]: Summary
  - generic [ref=e27]:
    - alert [ref=e28]:
      - generic [ref=e29]: Info
      - paragraph [ref=e32]: Input your Pi info if no longer defaults.
    - alert [ref=e33]:
      - generic [ref=e34]: Error
      - paragraph [ref=e37]: "Connection failed: ssh: handshake failed: ssh: unexpected message type 51 (expected 60)"
    - generic [ref=e38]:
      - generic [ref=e39]: 
      - generic [ref=e41]:
        - heading "Raspberry Pi Connection" [level=1] [ref=e42]
        - generic [ref=e43]:
          - textbox "raspberrypi.local" [ref=e45]: localhost
          - textbox "pi" [ref=e47]: testuser
          - textbox "Password" [ref=e49]: wrongpassword
          - button "Test Connection" [ref=e51] [cursor=pointer]
```