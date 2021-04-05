$(document).ready(function () {

    // Variable Declarations and setup
    var connection = false;
    var host = 'raspi.local';
    var user = 'pi';
    var piPass = 'raspberry';
    var vol = 'USB';
    var netType = 'cifs';
    var back = 'DropbBox';
    var log = 'Log2Ram';
    var stack = 'Network Stack';
    var netShare = '';
    var netUser = '';
    var netPassword = '';
    var containers = [];
    var ghUser = 'None';
    var ghEmail = 'None';
    var ghPass = 'None';
    var ghRepo = 'None';
    var voldone = false;
    var backupdone = false;

    // Hide unused elements until needed
    $("#drive").hide();
    $("#dropbox").hide();
    $("#networkVol").hide();
    $("#noVol").hide();
    $("#IoTStackTbl").hide();
    $("#mediaStackTbl").hide();
    $('#connectLoader').hide();
    $("#connectFail").hide();
    $("#connectFailWrongPi").hide();
    $('#connectSuccess').hide();
    $("#connectFalse").hide()
    $("#containerPane").hide();
    $("#volumePane").hide();
    $("#loggingPane").hide();
    $("#backupPane").hide();
    $("#summaryPane").hide();
    $("#log2Vol").hide();
    $("#noLog").hide();
    $("#volSuccess").hide();
    $("#volFail").hide();
    $("#backupSuccess").hide();
    $("#backupFail").hide();

    // Set Starting Pane
    let activePane = "#connectionPane";

    // Set Active Button
    let activeButton = ("#connectionButton");
    $(activeButton).addClass("bg-gray-800")

    // Expose the JS function for updating
    eel.expose(updatePiFunction);

    function updatePiFunction(line) {
        $("#itemSummary").html(
            "<div class='flex-auto'><u><h1>Updating Pi</h1></u></div> \
            <br> \
            <div class='flex-auto'> \
            <p>" + line + "</p> \
            </div>"
        );
    };

    eel.expose(installSoftware);

    function installSoftware(line) {
        $("#itemSummary").html(
            "<div class='flex-auto'><u><h1>[x] Update Pi</h1></u>\
            <br> \
            <u><h1>Installing Software (this will take a while)...</h1></u> \
            <br></div>  \
            <div class='flex-auto'> \
            <p>" + line + "</p> \
            </div>"
        );
    }

    eel.expose(prepUSB);

    function prepUSB(line) {
        $("#usbStatus").html(
            "<div class='flex-auto'><u><h1>Preparing USB drive ...</h1></u>\
            <br> \
            <p>" + line + "</p> \
            </div>"
        )
    }

    eel.expose(netUpdate);

    function netUpdate(line) {
        $("#networkStatus").html(
            "<div class='flex-auto'><u><h1>Preparing Network ...</h1></u>\
            <br> \
            <p>" + line + "</p> \
            </div>"
        )
    }

    eel.expose(installPortainer);

    function installPortainer(line) {
        $("#itemSummary").html(
            "<div class='flex-auto'><u><h1>[x] Update Pi</h1></u>\
            <br> \
            <u><h1>[x] Install Software ...</h1></u> \
            <br> \
            <u><h1>Deploying Portainer ...</h1></u> \
            <br></div>  \
            <div class='flex-auto> \
            <p>" + line + "</p> \
            </div>"
        );
    }

    eel.expose(gitHubUpdate);
    
    function gitHubUpdate(line) {
        $("#ghStatus").html(
            "<div class='flex-auto'><u><h1>Preparing GitHub Backup ...</h1></u>\
            <br> \
            <p>" + line + "</p> \
            </div>"
        )
    }
    
    // Manage Navigation Pane
    $("#connectionButton").click(function() {
        if (activePane != "#connectionPane") {
            $(activePane).hide();
        };
        activePane = "#connectionPane";
        $(activePane).fadeIn();

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = "#connectionButton";
        $(activeButton).addClass("bg-gray-800")
    });

    $("#containerButton").click(function() {
        if (activePane != "#containerPane") {
            $(activePane).hide();
        };
        activePane = "#containerPane";
        $(activePane).fadeIn()

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = "#containerButton";
        $(activeButton).addClass("bg-gray-800")
    });

    $("#volumeButton").click(function() {
        if (activePane != "#volumePane") {
            $(activePane).hide();
        };
        activePane = "#volumePane";
        $(activePane).fadeIn();

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = ( this );
        $(activeButton).addClass("bg-gray-800")
    });

    $("#loggingButton").click(function() {
        if (activePane != "#loggingPane") {
            $(activePane).hide();
        };
        activePane = "#loggingPane";
        $(activePane).fadeIn()

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = ( this );
        $(activeButton).addClass("bg-gray-800")
    });

    $("#backupButton").click(function() {
        if (activePane != "#backupPane") {
            $(activePane).hide();
        };
        activePane = "#backupPane";
        $(activePane).fadeIn( function () {
            if ( voldone != true ) {
                $("#backupFail").fadeIn();
                $("#backupModelFail").text('Volume must be configured before backup.');
            }
            else {
                $("backupFail").hide();
                $("#backupSuccess").hide();
            }
        })

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = ( this );
        $(activeButton).addClass("bg-gray-800")
    });

    $("#summaryButton").click(function() {
        if (activePane != "#summaryPane") {
            $(activePane).hide();
        };
        activePane = "#summaryPane";
        $(activePane).fadeIn()

        if (activeButton != ( this )) {
            $(activeButton).removeClass("bg-gray-800");
        };
        activeButton = ( this );
        $(activeButton).addClass("bg-gray-800")

        $("#summaryHost").text("Host: " + host);
        $("#summaryUser").text("User: " + user);
        if (connection == true ) {
            $("#piConnected").removeClass("text-red-500");
            $("#piConnected").addClass("text-green-500");
            $("#piConnected").text("Status: Connected");
        }
        else {
            $("#piConnected").addClass("text-red-500");
            $("#piConnected").removeClass("text-green-500");
            $("#piConnected").text("Status: Not Connected");
        }
        $("#stackSelection").text("Stack: " + stack);
        $("#volSelection").text("Volume Location: " + vol);
        $("#loggingSelection").text("Logging Configured: " + log);
        $("#cloudSelection").text("Backup Location: " + back);
    });

    // Container Selection Toggles
    $("#pihole").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#unifi").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#nginx").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#openhab").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#mosquitto").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#grafana").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#squid").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#heimdal").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#influxdb").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#hass").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#plex").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#emby").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    $("#nextcloud").click(function() {
        $( this ).toggleClass("bg-gray-800");
    })

    // Network Select Setup
    $("#cifs").addClass("bg-gray-800");

    // Network Type Selection
    $("#nfs").click(function() {
        $( this ).toggleClass("bg-gray-800");
        $("#cifs").removeClass("bg-gray-800");
        $("#netPassword").hide();
        $("#netUsername").hide();
        $("#netPasswordLabel").hide();
        $("#netUsernameLabel").hide();
        netType = 'nfs'
    })

    $("#cifs").click(function() {
        $( this ).toggleClass("bg-gray-800");
        $("#nfs").removeClass("bg-gray-800");
        $("#netPassword").fadeIn();
        $("#netUsername").fadeIn();
        $("#netPasswordLabel").fadeIn();
        $("#netUsernameLabel").fadeIn();
        netType = 'cifs'
    })

    // Pi Connection Form Validators
    $("#piHost").on('input', function() {
        let input = $(this);
        let re = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        let is_ip = re.test(input.val());
        if (is_ip) {input.removeClass('border-red-600').addClass('border-green-600');}
        else {input.removeClass('border-green-600').addClass('border-red-600');}
    })

    $("#piUser").on('input', function () {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');}
        else {input.removeClass('border-green-600').addClass('border-red-600');} 
    })

    $("#piPass").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');}
        else {input.removeClass('border-green-600').addClass('border-red-600');}
    })

    // GH Form Validators
    $("#ghUser").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');ghUser = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600');} 
    })

    $("#ghEmail").on('input', function() {
        let input = $(this);
        let re =  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        let is_email = re.test(input.val());
        if (is_email) {input.removeClass('border-red-600').addClass('border-green-600');ghEmail = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600');}       
    })

    $("#ghPass").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');ghPass = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}  
    })

    $("#ghRepo").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');ghRepo = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}  
    })

    // USB Volume Validator
    $("#volLocation").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');vol = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}
    })

    // Net Volume Validator
    $("#mntLocation").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');vol = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}
    })

    $("#netLocation").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');netShare = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}
    })

    $("#netUsername").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');netUser = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}
    })

    $("#netPassword").on('input', function() {
        let input = $(this);
        let is_name = input.val();
        if (is_name) {input.removeClass('border-red-600').addClass('border-green-600');netPassword = input.val();}
        else {input.removeClass('border-green-600').addClass('border-red-600')}
    })

    // Connect Test Button
    $("#connectTest").click(async function run() {
        $('#connectLoader').fadeIn();
        $("#connectInfo").hide();
        $("#connectFail").hide();
        $("#connectSuccess").hide();

        host = $('#piHost').val();
        user = $('#piUser').val();
        piPass = $('#piPass').val();

        if (host == '') {
            host = 'raspi.local';
        }

        if (user == '') {
            user = 'pi';
        }

        if (piPass == '') {
            piPass = 'raspberry';
        }

        let status = await eel.test_ssh(host, user, piPass) ();
        if (status != "connected") {
            $("#modelFail").text(status)
            $("#connectFail").fadeIn();
            connection = false;
        }

        $('#connectLoader').fadeOut();

        let model = await eel.get_model(host, user, piPass) ();

        if ( model.includes("Raspberry Pi 4") ) {
            $("#connectSuccess").hide();
            $("#connectFail").hide();
            $("#modelSuccess").text("Connected to your " + model);
            $("#connectSuccess").fadeIn();
            connection = true;
        }
        else {
            $("#connectSuccess").hide();
            $("#connectFail").hide();
            $("#modelFail").text(model);
            $("#connectFail").fadeIn();
            connection = false;
        }
    })

    // Stack Selection 
    $("#stackSelect").change( function() {
        if ($("#stackSelect option:selected").val() == "val1") {
            $("#IoTStackTbl").hide();
            $("#mediaStackTbl").hide();
            $("#networkStackTbl").fadeIn();
            $("#stackSelected").text("Please select all containers you wish installed in your stack.");
            stack = "Network Stack";
        }
        if ($("#stackSelect option:selected").val() == "val2") {
            $("#networkStackTbl").hide();
            $("#mediaStackTbl").hide();
            $("#IoTStackTbl").fadeIn();
            $("#stackSelected").text("Please select all containers you wish installed in your stack.");
            stack = "IoT Stack";
        }
        if ($("#stackSelect option:selected").val() == "val3") {
            $("#IoTStackTbl").hide();
            $("#networkStackTbl").hide();
            $("#mediaStackTbl").fadeIn();
            $("#stackSelected").text("Please select all containers you wish installed in your stack.");
            stack = "Media Stack";
        }
        if ($("#stackSelect option:selected").val() == "val4") {
            $("#IoTStackTbl").hide();
            $("#mediaStackTbl").hide();
            $("#networkStackTbl").hide();
            $("#stackSelected").text("Ok, I will install docker, portainer, and other configuration options. You can do the rest");
            stack = "None";
        }
    })

    // Volume Selection
    $("#volSelect").change( function () {
        if ($("#volSelect option:selected").val() == "val1") {
            $("#volIcon").removeClass('fab fa-usb');
            $("#volIcon").removeClass('fas fa-network-wired');
            $('#volIcon').removeClass('fas fa-hdd');
            $("#volIcon").addClass('fab fa-usb');
            $("#networkVol").hide();
            $("#noVol").hide();
            $("#usbVol").fadeIn();
            $("#volSelected").text("Please ensure your USB device is connecte to Pi and specify mount location.")
        }
        if ($("#volSelect option:selected").val() == "val2") {
            if (netType == 'nfs') {
                $("#netPassword").hide();
                $("#netUsername").hide();
                $("#netPasswordLabel").hide();
                $("#netUsernameLabel").hide();
            }
            else {
                $("#netPassword").fadeIn();
                $("#netUsername").fadeIn();
                $("#netPasswordLabel").fadeIn();
                $("#netUsernameLabel").fadeIn();
            }
            $("#volIcon").removeClass('fab fa-usb');
            $("#volIcon").removeClass('fas fa-network-wired');
            $('#volIcon').removeClass('fas fa-hdd');
            $("#volIcon").addClass('fas fa-network-wired');
            $("#usbVol").hide();
            $("#noVol").hide();
            $("#networkVol").fadeIn();
            $("#volSelected").text("Please select type of network location and fill in required information.")
        }
        if ($("#volSelect option:selected").val() == "val3") {
            $("#volIcon").removeClass('fab fa-usb');
            $("#volIcon").removeClass('fas fa-network-wired');
            $('#volIcon').removeClass('fas fa-hdd');
            $('#volIcon').addClass('fas fa-hdd');
            $("#usbVol").hide();
            $("#networkVol").hide();
            $("#volSelected").text("We will just put everything in the default locations.")
            vol = 'None';
        }
    })

    // Logging Selection
    $("#logSelect").change( function() {
        if ($("#logSelect option:selected").val() == "val1") {
            $("#logSelected").text("Log2Ram will be installed and configured. Swap and paging will be removed also.")
            log = "Log2Ram";
        }
        if ($("#logSelect option:selected").val() == "val2") {
            $("#logSelected").text("Logs will be sent to LOG folder in the volume you selected in Volume Config Section.")
            log = "Log to Volume";
        }
        if ($("#logSelect option:selected").val() == "val3") {
            $("#logSelected").text("No additional logging will be configured outside defaults set by applications.")
            log = "None";
        }
    })

    // Cloud Backup Selection
    $("#cloudSelect").change( function() {
        if ($("#cloudSelect option:selected").val() == "val1") {
            $("#cloudIcon").removeClass('fas fa-cloud-upload-alt');
            $("#cloudIcon").removeClass('fab fa-google-drive');
            $('#cloudIcon').removeClass('fab fa-github');
            $("#cloudIcon").addClass('fab fa-dropbox');
            $("#github").hide();
            $("#backupSelected").text("Rclone will be installed and after you must run rclone config to setup your backup.");
            back = 'Dropbox';
        }
        if ($("#cloudSelect option:selected").val() == "val2") {
            $("#cloudIcon").removeClass('fas fa-cloud-upload-alt');
            $("#cloudIcon").removeClass('fab fa-dropbox');
            $('#cloudIcon').removeClass('fab fa-github');
            $("#cloudIcon").addClass('fab fa-google-drive');
            $("#github").hide();
            $("#backupSelected").text("Rclone will be installed and after you must run rclone config to setup your backup.")
            back = 'Google Drive';
        }
        if ($("#cloudSelect option:selected").val() == "val3") {
            $("#cloudIcon").removeClass('fas fa-cloud-upload-alt');
            $("#cloudIcon").removeClass('fab fa-dropbox');
            $("#cloudIcon").removeClass('fab fa-google-drive');
            $('#cloudIcon').addClass('fab fa-github');
            $("#github").fadeIn();
            $("#backupSelected").text("Please input requested information and your volume folder will be configured as a github repo and backed up daily.")
            back = 'GitHub';
        }
        if ($("#cloudSelect option:selected").val() == "val4") {
            $("#cloudIcon").removeClass('fab fa-dropbox');
            $("#cloudIcon").removeClass('fab fa-google-drive');
            $('#cloudIcon').removeClass('fab fa-github');
            $("#cloudIcon").addClass('fas fa-cloud-upload-alt');
            $("#github").hide();
            $("#backupSelected").text("No backup will be configured nor will backup software be installed. You can configure on your own.")
            back = 'none';
        }
    }) 

    // Config USB
    $("#configUSB").click(async function run() {
        voldone = await eel.prep_usb(host, user, piPass, vol) ();
        if (voldone != 'true') {
            $("#volSuccess").hide();
            $("#volFail").fadeIn();
            $("#volModelFail").text(voldone)
            voldone = false
        }
        if (voldone == 'true') {
            voldone = true
            $("#volFail").hide();
            $("#volSuccess").fadeIn();
            $("#volModelSuccess").text("USB Device Setup Complete.")
        }
    })

    // Config Network
    $("#configNetwork").click(async function run() {
        if (netType == 'cifs'){
            voldone = await eel.prep_net_cifs(host, user, piPass, vol, netShare, netUser, netPassword) ();
            if (voldone != 'true') {
                $("#volSuccess").hide();
                $("#volFail").fadeIn();
                $("#volModelFail").text(voldone)
                voldone = false
            }
            if (voldone == 'true') {
                $("#volFail").hide();
                $("#volSuccess").fadeIn();
                $("#volModelSuccess").text("Network Volume Setup Complete.")
                voldone = true
            }
         }
        if (netType == 'nfs'){
            voldone = await eel.prep_net_nfs(host, user, piPass, vol, netShare) ();
            if (voldone != 'true') {
                $("#volSuccess").hide();
                $("#volFail").fadeIn();
                $("#volModelFail").text(voldone)
                voldone = false
            }
            if (voldone == 'true') {
                $("#volFail").hide();
                $("#volSuccess").fadeIn();
                $("#volModelSuccess").text("Network Volume Setup Complete.")
                voldone = true
            } 
        }
    })

    // Config Github
    $("#configGithub").click(async function run() {
        backupdone = await eel.prep_github(host, user, vol, ghUser, ghPass, ghEmail, ghRepo) ();
        if (backupdone != 'true') {
            $("#backupSuccess").hide();
            $("#backupFail").fadeIn();
            $("#backupModelFail").text(backupdone);
            backupdone = false;
        }
        if (backupdone = 'true') {
            $("#backupFail").hide();
            $("#backupSuccess").fadeIn()
            $("#backupModelSuccess").text("GitHub Backup Setup Complete.")
        }
    })

    // Do It clicked
    $("#doIt").click(async function run() {
        if ($("#verifiedDoIt").is(':checked')) {
            let updated = await eel.update_pi(host, user, piPass) ();
            if (updated == 'true'){
                let software = await eel.install_pi(host, user, piPass, vol) ();
                if (software == 'true') {
                    let portainer = await eel.install_portainer(host, user, piPass, vol) ();
                    if (portainer == 'true') {

                    }
                    else {
                        alert(portainer)
                    }
                }
                else {
                    alert(software)
                }
            }
            else {
                alert(updated)
            }
        }
        else {
            $("#verifiedDoIt").parent().removeClass('text-gray-500')
            $("#verifiedDoIt").parent().addClass('text-red-500')
            $(".shake").effect("shake", { direction: "left", times:4}, 1000);
        }
    })
})