
# notmuch-electron

notmuch-electron is a mail user agent developed using electron and built on top of not much for linux and macos environment.

A short demo is available [here](https://videos.diverse-team.fr/notmuch-electron.html).

## Table of contents

- [notmuch-electron](#notmuch-electron)
  - [Table of contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Features](#features)
  - [Install](#install)
    - [Remember the milk](#remember-the-milk)
    - [Configure mbsync](#configure-mbsync)
    - [Configure msmtp](#configure-msmtp)
    - [Configure notmuch](#configure-notmuch)
    - [Configure afew](#configure-afew)
    - [Configure automatic synchronisation](#configure-automatic-synchronisation)
  - [Technologies used](#technologies-used)
- [Join the development](#join-the-development)
  - [Build](#build)
    - [Known issue](#known-issue)
  - [Contribute](#contribute)

## Requirements

Before we get started, let me just tell you a bit about how I use email.

- I currently have several IMAP-email accounts with different email-service-providers
- **I don't sort emails into project/customer-folders, I prefer to search through my emails instead**.
- I can have several archive-folder per email account
- I do not want to fetch my emails manually. I want to get push, notifications.
- I wante to write and read HTML-emails.
- I write emails in English and French.
- I use linux.
- All emails will be synced to a local folder on my computer, as an eternal backup.
- I want to create meeting from my email
- I want to create task (rememberthemilk) from my email
- I travel a lot and I need an email that support numerous network lost every day.

It exists several great tool throught the CLI, the most famous one is [NotMuch](https://notmuchmail.org/).  Notmuch is a mail indexer. Essentially, is a very thin front end on top of [xapian](https://xapian.org/). Much like Sup, it focuses on one thing: indexing your email messages. Notmuch can be used as an email reader, or simply as an indexer and search tool for other MUAs, like mutt. I do not find the MUA that perfectly fit my neet. That is why, I develop recently a new one using electron, angular and primeng.

To send email, I use [nodemailer](https://www.nodemailer.com/) on top [msmtp](https://marlam.de/msmtp/).

To synchonize email, I use [mbsync](http://isync.sourceforge.net/mbsync.html).

To manage the task, I use [rememberthemilk](https://www.rememberthemilk.com/app/#list/14936389).

To apply some rules on incoming messages, I use [afew](https://github.com/afewmail/afew). **afew** is an initial tagging script for notmuch:

To get push, notifications when new email arrive, I use a personal version of [node-imapnotify](https://github.com/barais/node-imapnotify) based on the initial version of [node-imapnotify](https://github.com/a-sk/node-imapnotify/).

This projet is an initial version of a mail user agent on top of notmuch to coordinate these tools.

## Features

- Reading email from several imap services (based on [mbsync](http://isync.sourceforge.net/mbsync.html))
- Composing new email
- Mail address completion based on mail history (ldap integration will arrive soon)
- Replying, Forwarding email
- editing as new email
- Fast mail query (thanks to [notmuch](https://notmuchmail.org/))
- Notmuch query completion
- ics event creation from email
- [Rememberthemilk](https://www.rememberthemilk.com/) task creation from email
- Email spell check with language detection (using ctrl + TAB to automatically detect the language)
- Customisable keyboard shortcuts (for shortcut to common queries)
- Customisable email text shortcut (useful for greeting formulas)
- Outbox folder management to send email when network connection is up
- smtp server selection for sending email
- Saving email as draft
- imap idle support to get push, notifications when new email arrive (see [Configure automatic synchronisation](#configure-automatic-synchronisation))
- drag and drop to add attachments
- color thread based on tags
- ...

## Install

First you need to install and configure msmtp, notmuch, mbsync for your account, I will detail at the end of this readme my configuration for these pieces of software.

See     [Configure mbsync](#configure-mbsync), [Configure msmtp](#configure-msmtp), [Configure notmuch](#configure-notmuch) and [Configure afew](#configure-afew)

Requirement *Notmuch >= 0.26*, afew >= 1.3 

```bash
sudo apt-get install msmtp isync notmuch notmuch-addrlookup afew gnupg2 ca-certificates
```

msmstp is optional, as you can passe the configuration of your smtp server in notmuch-electron config file but msmtp could use password store in your key manager which is a better practise.

Check if you can:

- sync your email

```bash
mbsync -Va
```

- query your mail index

```bash
notmuch search --limit=3 --format=json path:INBOX/**
```

- query your mail address index

```bash
notmuch-addrlookup joh
 ```

- Send a simple email with your different acount

```bash
printf "To: @domain.com\nFrom: @gmail.com\nSubject: Email Test Using MSMTP\nHello there. This is email test from MSMTP." | msmtp recipient@domain.com
```

Next you need to install mktemp and base64.

```bash
sudo apt-get install coreutils
```

Next you can [download](https://github.com/barais/notmuch-electron/releases) notmuch-electron. It comes as an [app image](https://appimage.org/). The AppImage format is a format for packaging applications in a way that allows them to run on a variety of different target systems (base operating systems, distributions) without further modification.

First, configure the application, in ~/.config/notmuch-electron/config.json put the following json file

```json
{
  "smtpaccounts": [{
      "name": "irisa",
      "transport": {
        "sendmail": true,
        "newline": "unix",
        "path": "/usr/bin/msmtp"
      },
      "from": "barais@irisa.fr",
      "signature": "Olivier Barais <BR> Equipe INRIA DiverSE <BR> Université de Rennes 1, INRIA, IRISA",
      "sentfolder": "IRISA/Sent",
      "draftfolder": "IRISA/Drafts"

    }, {
      "name": "rennes1",
      "transport": {
        "sendmail": true,
        "newline": "unix",
        "args": ["-a", "rennes1"],
        "path": "/usr/bin/msmtp"
      },
      "from": "olivier.barais@univ-rennes1.fr",
      "signature": "Olivier Barais <BR> Equipe INRIA DiverSE <BR> Université de Rennes 1, INRIA, IRISA",
      "sentfolder": "IRISA/Sent",
      "draftfolder": "IRISA/Drafts"

    }

  ],
  "defaultoutputfolder": "IRISA/Outbox",
  "notmuchpath": "/usr/bin/notmuch",
  "base64path": "/usr/bin/base64",
  "notmuchaddresspath": "/usr/bin/notmuch-addrlookup",
  "mktemppath": "/bin/mktemp",
  "localmailfolder": "/home/barais/mail",
  "localmailfoldermultiaccounts": true,
  "defaultquery": "path:IRISA/INBOX/**",
  "tmpfilepath": "/tmp/titi.XXXXXXX",
  "defautEventMailInvit": "barais@irisa.fr",
  "defautEventMailCalendar": "olivier.barais@irisa.fr",
  "defautICSUser": "Olivier Barais",
  "rtm": {
    "API_KEY": "*YOURAPIKEY*",
    "API_SECRET": "YOURAPISECRETKEY"
  },
  "shortcutqueries": [
    {
      "shortcut": "g l",
      "query": "path:IRISA/INBOX/** -tag:lists"
    },
    {
      "shortcut": "g g",
      "query": "path:gmail/** -tag:list"
    }

  ],
  "shortcutmailtyping": [
    {
      "shortcut": "cor",
      "formula": "Cordialement,"
    },
    {
      "shortcut": "sin",
      "formula": "Sincèrement,"
    },
    {
      "shortcut": "bes",
      "formula": "Best regards,"
    }
  ],
  "colortags": [
    {
      "tags": "todo",
      "color": "red"
    },
    {
      "tags": "replied",
      "color": "blue"
    }
  ]

}
```

In this file, you must configure:

- the different smtp account (*transport* follows the nodemailer tranport configuration, *signature* is the signature to include in your message, *sentfolder* and *draftfolder*  correspond to the notmuch path used to save your sent and draft messages) (*smtpaccounts*)
- the notmuch path used to save the message that can not been sent and that will be sent later (*defaultoutputfolder*)
- the path for the different command used (base64, notmuch, notmuch-addrlookup, mktemp) (*notmuchpath*, *base64path*, *notmuchaddresspath*, *mktemppath* )
- the path and template used to create tmpfile (*tmpfilepath*)
- the path for your local email folder (*localmailfolder*)
- to explain if you use a configuration with multipl mail provider in this case the first subfolder level does nnot contain email but email folder only. (*localmailfoldermultiaccounts*),
- Default query used when application will start. (*defaultquery*)
- the default ICS Attendee to add an event in your calendar (*defautEventMailCalendar*)
- The default email address to use when user will reply to a event invitation (*defautEventMailInvit*)
- The default user name used as an organizer in the ICS. (*defautICSUser*)
- the different shortcut that can be used to automatically execute notmuch query (g * to select all messages. (*shortcutqueries*)
- the different mail editing shortcut that can be used to automatically replace text when composing email using ctrl + UP keyboard. (*shortcutmailtyping*)
- the different color to use when a thread as a specifig tag (used space between tag if you want to apply in several tag exist for this thread). (*colortags*)

### Remember the milk

If you want to use *remeberthemilk*, [apply for an api key](https://www.rememberthemilk.com/services/api/).
If you do not want to use *remeberthemilk*, just remove rtf field from your config object. For the first used of remember the milk, you must get your access token in clicking on the init rtm button on one of your email. It will open a browser windows to grant access to your remember the milk account.

### Configure mbsync

For configuring mbsync, you can follow the [following guide](http://fengxia.co.s3-website-us-east-1.amazonaws.com/mbsync%20mu4e%20email.html)

create the mailfolder and a mail folder for each mail provider

```bash
mkdir ~/mail
mkdir ~/mail/IRISA
mkdir ~/mail/gmail
```

Just for my personal use, I add the following config file. To create the gpg file, just run the following command. Do not hesitate to use your password manager to save the pass.

```bash
# change password with your mail password
echo -e "password" | gpg2  --symmetric  -o ~/mail/zimbra.inria.fr.gpg
# change the output file

```

For getting the certificate for your server, you can follow the [following guide](http://fengxia.co.s3-website-us-east-1.amazonaws.com/mbsync%20mu4e%20email.html).

```txt
IMAPAccount  main
Host zimbra.inria.fr
User barais
PassCmd "gpg2 -q --for-your-eyes-only --no-tty -d ~/zimbra.inria.fr.gpg"
SSLType IMAPS
CertificateFile /home/barais/mail/zimbra.pem

IMAPStore main-remote
Account main

MaildirStore main-local
Path /home/barais/mail/IRISA/
Inbox /home/barais/mail/IRISA/INBOX
Flatten .

Channel main
Master :main-remote:
Slave :main-local:
Patterns INBOX Sent Drafts Trash Archives
Create Both
Sync Full
SyncState *
CopyArrivalDate yes
```

### Configure msmtp

```txt
defaults
logfile  ~/.msmtp.log
port 587
tls on

tls_trust_file /etc/ssl/certs/ca-certificates.crt

account irisa
host smtp.inria.fr
from barais@irisa.fr
auth on
user barais

# Password method 1: Add the password to the system keyring, and let msmtp get
# it automatically. To set the keyring password using Gnome's libsecret:
# $ secret-tool store --label=msmtp\
#   host smtp.freemail.example\
#   service smtp\
#   user joe.smith

# Password method 2: Store the password in an encrypted file, and tell msmtp
# which command to use to decrypt it. This is usually used with GnuPG, as in
# this example. Usually gpg-agent will ask once for the decryption password.
passwordeval gpg2 -q --for-your-eyes-only --no-tty -d ~/mail/zimbra.inria.fr.gpg


account rennes1
host smtps.univ-rennes1.fr
from olivier.barais@univ-rennes1.fr
auth on
user obarais
passwordeval gpg2 -q --for-your-eyes-only --no-tty -d ~/mail/rennes1.gpg
# Set a default account
account default : irisa
```

### Configure notmuch

Configuring not much is quite easy. Please refer [to notmuch](https://notmuchmail.org/) website. Please find below an example for my configuration

```txt
[database]
path=/home/barais/mail

# User configuration
#
# Here is where you can let notmuch know how you would like to be
# addressed. Valid settings are
#
# name Your full name.
# primary_email Your primary email address.
# other_email A list (separated by ';') of other email addresses
# at which you receive email.
#
# Notmuch will use the various email addresses configured here when
# formatting replies. It will avoid including your own addresses in the
# recipient list of replies, and will set the From address based on the
# address to which the original email was addressed.
#
[user]
name=Barais Olivier
primary_email=barais@irisa.fr
other_email=olivier.barais@irisa.fr;olivier.barais@gmail.com;olivier.barais@univ-rennes1.fr

# Configuration for "notmuch new"
#
# The following options are supported here:
#
# tags A list (separated by ';') of the tags that will be
#    added to all messages incorporated by "notmuch new".
#
#    ignore A list (separated by ';') of file and directory names
# that will not be searched for messages by "notmuch new".
#
# NOTE: *Every* file/directory that goes by one of those
# names will be ignored, independent of its depth/location
# in the mail store./usr/bin/afew --move-mails --all
#
[new]
tags=unread;inbox;new;
ignore=.uidvalidity;.mbsyncstate;*.gpg

# Search configuration
#
# The following option is supported here:
#
# exclude_tags
# A ;-separated list of tags that will be excluded from
# search results by default.  Using an excluded tag in a
# query will override that exclusion.
#
[search]
exclude_tags=deleted;spam;

# Maildir compatibility configuration
#
# The following option is supported here:
#
# synchronize_flags      Valid values are true and false.
#
# If true, then the following maildir flags (in message filenames)
# will be synchronized with the corresponding notmuch tags:
#
# Flag Tag
# ---- -------
# D draft
# F flagged
# P passed
# R replied
# S unread (added when 'S' flag is not present)
#
# The "notmuch new" command will notice flag changes in filenames
# and update tags, while the "notmuch tag" and "notmuch restore"
# commands will notice tag changes and update flags in filenames
#
[maildir]
synchronize_flags=true

```

### Configure afew

The [documentation](https://afew.readthedocs.io/en/latest/) of **afew** is great. Please follow it to configure afew.

A few could be used also to automatically move mail to specific folder.

The main important thing is to not forget to create a post-new hook for notmuch (see [https://afew.readthedocs.io/en/latest/quickstart.html#initial-config](https://afew.readthedocs.io/en/latest/quickstart.html#initial-config)).

### Configure automatic synchronisation

When everything work you can configure crontab to automatically update your email. For doing regular update  the best is to use crontab but we will first install sem to avoid simultaneous executions of mbsync.

```bash
sudo apt-get install parallel
sem --will-cite #to disable sem citation output
```

Next on crontab you can add in your contab (update with the correct path)

```bash
*/2 * * * * sem --fg -j 1 --id mbsync  '/home/barais/git/isync-isync/src/mbsync -a' ; sem -j 1 --fg --id notmuch '/usr/local/bin/notmuch new --quiet'
```

If you want to use idle (support the notification from the server when new mail arrive).

You can fork [this repository](https://github.com/barais/node-imapnotify).

```bash
git clone https://github.com/barais/node-imapnotify
```

update the config.js file and copy it to ~/.config/node-imapnotify folder.

```bash
cd node-imapnotify
npm install
mkdir ~/.config/node-imapnotify
cp config.js  ~/.config/node-imapnotify
./bin/imapnotify -c  ~/.config/node-imapnotify/config.js
```

Enjoy.

## Technologies used

- [Electron angular native](https://github.com/meltedspark/electron-angular-native/)
- [Electron](http://electron.atom.io/) 4
- [Spectron](https://github.com/electron/spectron) 5
- [Angular](https://angular.io/) 7
- [Angular CLI](https://cli.angular.io/) 7
- [Angular AoT](https://angular.io/guide/aot-compiler) for production
- [Typescript](https://www.typescriptlang.org/) 3
- Native node.js addons (using [nan](https://github.com/nodejs/nan))
- Native libraries support (using [node-ffi-napi](https://github.com/node-ffi-napi/node-ffi-napi))
- Hot reload for development

# Join the development

## Build

you need to install node and the dependencies for [angular electron native](https://github.com/meltedspark/electron-angular-native/)

```bash
npm i -g yarn
yarn install
yarn
yarn start # to develop
yarn dist:linux:64 # To build the image
```

### Known issue

I had to install libxkbfile-dev

## Contribute

Do not hesitate to fork, create bug report or pull request.
