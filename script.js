
var TheForm;

window.setupGapi = function() {

}

document.addEventListener('DOMContentLoaded', function () {
    var i = 0;
    var boundary = 'hello_pdpc_youre_welcome';

function b64EncodeUnicode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

    Vue.component('formItem', {
        template: '<div class="form-item"><slot></slot></div>',
        ready: function() {
            var input = this.$el.querySelector('input');
            var label = this.$el.querySelector('label');

            if (input && label) {
                if (!input.id) {
                    input.setAttribute('id', 'element' + i++);
                }
                label.setAttribute('for', input.id);
            }

        },
    });

    Vue.filter('cb', function (value, check, print) {
        if (!print) {
            print = check;
        }
        if (value == check) {
            return '✓ ' + print;
        }
        else {
            return '_ ' + print;
        }
    });

    TheForm = new Vue({
        el: 'form',
        data: {
            destEmail: 'Blank',
            medium: 'SMS',
            name: '',
            fullName: '',
            email: '',
            telephone: '',
            date: '',
            time: '',
            nric: '',
            telco: 'Singtel',
            attachmentSrc: null,

            noOngoingRelationship: true,
            consentWithdrawn: false,

            multiSIM: false,
            callForwarding: false,
            mobileFax: false,

        },

        computed: {
            today: function() {
                return new Date(
                    new Date().getTime() +
                    -60000 * new Date().getTimezoneOffset())
                    .toISOString().substr(0,10);
            },
            textMessage: function() {
                try {
                    var self = this;
                    var messageHeaders = [
        'Date: ' + new Date().toString(),
        'From: ' + this.name + ' <' + this.email + '>',
        'To: ' + this.destEmail,
        'Subject: Report a Do Not Call Registry concern',
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' + boundary + '"',
        'Content-Transfer-Encoding: 8bit',
        ];
                        var messageBody = [
        '--' + boundary,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        '<!doctype html>',
        '<html><head><meta charset="utf-8"></head><body>',
        document.querySelector('.email-preview').innerHTML,
        '</body></html>',
        ]
                        var message = messageHeaders.map(function(line) {
                                            return line + '\r\n';
                                        }).join('')
                                + '\r\n' + messageBody.map(function (line) {
                                    return self.$interpolate(line) + '\r\n';
                                }).join('');

                        return message;
                } catch(err) {
                    console.log(err.message);
                    console.log(err.stack);
                }
            },

            message: function() {
                try {
                    var message = this.textMessage;
                    var messageBody = [];
                    var self = this;
                    if (this.attachmentSrc) {
                        var attachmentBase64 = this.attachmentSrc.substr(this.attachmentSrc.indexOf(',') + 1)
                        var parts = [];

                        for (var i=0; i<attachmentBase64.length; i+=100) {
                            parts.push(attachmentBase64.substr(i, 100));
                        }

                        var attachmentMime = this.$file.type || 'application/octet-stream'
                        var messageAttachment = [
        '--' + boundary,
        'Content-Type: ' + attachmentMime + '; name="'
                    + this.$file.name.replace(/"/g, '_')
                    + '"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="'
                    + this.$file.name.replace(/"/g, '_')
                    + '"',
        '',
        ].concat(parts)
                        messageBody = messageBody.concat(messageAttachment);
                    }
                    messageBody.push('--' + boundary + '--')

                    message = message + messageBody
                        .map(function (line) {
                            return line + '\r\n';
                        })
                        .join('')
                    return message;
                }catch (err) {
                    console.log(err.message);
                    console.log(err.stack);
                }
            },
        },

        methods: {
            setTime: function (msdiff) {
                var t = new Date().getTime() + msdiff;
                var dts = new Date(t - new Date().getTimezoneOffset() * 60000).toISOString()

                this.date = dts.substr(0,10);
                this.time = dts.substr(11,5);
            },

            fileSelected: function() {
                var file = document.getElementById("screenshot").files[0]
                var freader = new FileReader();

                this.$file = file;
                this.$attachment = file;
                var self = this;

                freader.onloadend = function () {
                    self.attachmentSrc = freader.result;
                },
                window.DURL = freader.readAsDataURL(file);
            },

            sendEmail: function(event, toWhom) {
                event.preventDefault();

                this.destEmail = toWhom == 'self' ? this.profile.getEmail() : 'info@pdpc.gov.sg';

                var raw = b64EncodeUnicode(this.message)
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=/g, '');
                console.log(this.message);

                var messageStructure = {
                    raw: raw,
                };

                var request = new XMLHttpRequest();
                request.onreadystatechange = function() {
                    if (request.readyState == XMLHttpRequest.DONE) {
                        if (request.status == 200) {
                            alert('Thank you for making Singapore a more pleasant place. You can check your Sent items folder to confirm that the report has been sent.')
                        }
                        else if (request.status >= 400) {
                            alert('Oops it seems that there have been some error sending the report. You\'d have to do it manually I guess. Sorry');
                        }
                        else {
                            alert('I didn\'t expect an error code of ' + request.status + '... Your report wasn\'t sent. You\'ll have to do it manually I guess. Sorry');
                        }
                        console.log(request.responseText);
                    }
                };
                request.open('POST',
                    'https://www.googleapis.com/gmail/v1/users/' + this.profile.getId() + '/messages/send',
                    true);
                request.setRequestHeader('Authorization', 'Bearer ' + this.user.getAuthResponse().access_token);
                request.setRequestHeader('Content-type', 'application/json');
                request.send(JSON.stringify(messageStructure));
            },
        },
    });

});

window.onSignIn = function(user) {
    var profile = user.getBasicProfile();

    TheForm.fullName = TheForm.name = profile.getName();
    TheForm.email = profile.getEmail();
    TheForm.profile = profile;
    TheForm.user = user;
    document.getElementById('full-name').focus();

    window.XX = profile;
    window.USER = user;
};

