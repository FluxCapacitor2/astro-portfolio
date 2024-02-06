---
title: CyberDiscord Open 2023 Review & Writeup
date: 2023-06-08
description: Discussing my experience competing in the four-hour cybersecurity competition, the vulnerabilities I found, and how I'm going to improve for next year's event.
image: ./image.png
modifiedDate: 2023-08-12
---

I recently got the chance to participate in the inaugural **CyberDiscord Open** cybersecurity competition,
a four-hour event that operates similarly to [CyberPatriot](https://www.uscyberpatriot.org/)
or <abbr title="National Collegiate Cyber Defense Competition">[NCCDC](https://www.nationalccdc.org/)</abbr>:

Here's a description from the competition organizer, Matthew Ring:

> The CyberDiscord Open is a cyber defense competition that allows teams to compete together or separately
> from any location around the world. Teams compete by securing provided Windows and Linux based virtual machines
> &mdash; removing malware and other infections, correcting misconfigurations, mitigating vulnerabilities, disabling
> vulnerable services, and so on. Additionally, teams will answer cybersecurity problems in a web-based challenge.
> Teams accumulate points for addressing each scored issue and must race against the clock to accumulate as many
> points as they can before time expires.

## Vulnerability Categories

The following is a list of scored vulnerability categories sent out by the competition organizer.
It gives competitors a general idea of what to look for and how to prepare.

| Category                                | Examples                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account Policies                        | Password Policy, Lockout Policy                                                                                                                        |
| Application Security Settings           | Critical Service Settings, Required Application Settings, Application Permission                                                                       |
| Application Updates                     | Application Updates, Application Automatic Update Settings                                                                                             |
| Defensive Countermeasures               | Firewall, Anti-virus, Encryption                                                                                                                       |
| Local Policies                          | Audit Policy, User Rights Assignment, Security Options &mdash; Security Options include Network Security Options and Privilege Elevation Authorization |
| Operating System Updates                | Windows Updates, Service Packs, Windows Automatic Update Settings                                                                                      |
| Policy Violation: Malware               | Backdoors, Remote Administration Tools, Keyloggers, Password Sniffers                                                                                  |
| Policy Violation: Prohibited Files      | Individual Files, Software Archives, Confidential In Forensic Questions                                                                                |
| Policy Violation: Unwanted Software     | Games, Servers, Scareware, Adware, PUP, "Hacking" Tools                                                                                                |
| Service Auditing                        | Enable and Disable Services                                                                                                                            |
| Uncategorized Operating System Settings | Remote Access, File Sharing, Screen Locking, Group Policy Settings, Operating System Permissions                                                       |
| User Auditing                           | Authorized Users, Groups, and other settings unique to users                                                                                           |
| Forensic Questions                      |                                                                                                                                                        |

## Fedora

On my team, I was the Fedora specialist. I gained **29 out of 100** possible points,
fixing **18 of 54** vulnerabilities and earning the **second-highest Fedora score**
in the competition!

For reference:

- [Fedora scores](https://web.archive.org/web/20230605030819/http://scoreboard.cyberdefensecompetition.org/image_detail.php?image=2) across all teams
- [Competition-wide image statistics](https://web.archive.org/web/20230605030559/http://scoreboard.cyberdefensecompetition.org/image_stats.php)

In the rest of this article, I'll discuss the challenges I was able to
solve, my impressions of the event, and how I can improve for future events.

### Forensic Questions

#### Finding the PrestaShop database credentials

On the system, a [LAMP](https://en.wikipedia.org/wiki/LAMP_%28software_bundle%29)
stack server was installed, which was used to run [PrestaShop](https://prestashop.com/).
Competitors were tasked with finding the PrestaShop admin's
MySQL username and password. The task itself was simple, but
the hardest part was finding where the configuration was located.
PrestaShop has [four different config files](https://devdocs.prestashop-project.org/8/development/configuration/configuring-prestashop/),
each with a slightly different purpose. I finally found the database
connection details in the `app/config/parameters.php` file.

Next, I had to connect to and exfiltrate some information from the database.
I connected to the database with the [`mysql` CLI](https://dev.mysql.com/doc/refman/8.0/en/mysql.html),
which was preinstalled (it likely came bundled with the MySQL server).
Again, the most challenging part was becoming quickly acquainted with PrestaShop's
internals. The `ps_customer` database table contained a column called `note`,
which was used to store private notes about a custom&mdash;or, in this case,
the answer to the forensic question.

#### Mounting a damaged RAID array

The image had two files on the desktop, `sda` and `sdc`. They were disk images
of two drives that formed a [RAID 5](https://en.wikipedia.org/wiki/Standard_RAID_levels#RAID_5)
array (RAID 5 requires three drives to operate normally, but the array can
repair itself using the data from only two drives). To access one of the files
on the array and complete the forensic question, I had to figure out how to mount them.

Essentially, I had to create a loop device for each file. This allows the system
to access the files as a _storage device_, rather than just a file:

```sh
$ losetup /dev/loop9 sda
$ losetup /dev/loop10 sdc
```

Then, I had to re-assemble a RAID array with both newly-created devices:

```sh
$ mdadm --assemble /dev/loop9 /dev/loop10
```

After that, I tried to mount the array using the terminal, but my attempts
weren't successful. I ended up using the graphical file manager to mount the
array and recover the file.

#### Strange regular expressions

One of the forensic questions required competitors to scan a directory
for files that contained any text matching a long, complicated [regex](https://en.wikipedia.org/wiki/Regular_expression).
Unfortunately, due to time pressure, I was not able to solve this challenge.
I suspect `grep` couldn't handle the regex because it contained an escaped
hyphen (`-`) in one of the character ranges, but [after moving it to the end](https://stackoverflow.com/questions/26754181/greps-invalid-range-end-bug-or-feature)
of the bracket expression, I didn't get any matches.

### Managing Users and Groups

User and group management is a common theme across every CyberPatriot
competition. During this event, I didn't have any scripts to do this
for me, so I had to manually go through the user list and make sure every
user was on the list of 25(!!) authorized users.

The README also told competitors to create a few new groups, add
users to them, and make sure every group member was authorized.

_New groups can be added with [`groupadd`](https://www.redhat.com/sysadmin/linux-groups),
and users can be added or removed from groups with [`usermod`](https://linux.die.net/man/8/usermod).
One of the easiest ways to manage users is to directly edit the `/etc/passwd` file._

### Removing Prohibited Files

Another staple of CyberPatriot competitions is removing prohibited games,
'hacking tools', and files. In this competition, I was able to find a Music
folder, but did not receive points for any other prohibited files or programs.

### Updating The System

The easiest way to gain points&mdash;even if it takes a while&mdash;is by
simply updating the system. In this case, Fedora uses [`dnf`](https://docs.fedoraproject.org/en-US/fedora/latest/system-administrators-guide/package-management/DNF/),
so it's as easy as typing `dnf update` in a terminal.

This awarded me points for updating software (`systemd` and `firewalld`)
but also in some unrelated categories, like fixing a shell backdoor
and modifying user permissions.

### Setting Up The Minecraft Server

Setting up a Minecraft server seemed easy&mdash;I've spent years working on
projects like [BlueDragon](https://bluedragonmc.com)&mdash;but there were
a few obstacles along the way.

1. The installed Java version was out of date. This was an easy fix (I just
   had to install the correct version using `dnf`), but I had to learn about
   [alternatives](https://docs.fedoraproject.org/en-US/packaging-guidelines/Alternatives/)
   to make the system actually use the new package I installed.
2. After starting the server, it creates a file called `eula.txt` in the current
   working directory. You have to change `eula=false` to `eula=true` to accept
   Minecraft's End-User License Agreement and then restart the server.
3. I was unable to get points until I used the `whitelist on` command in the
   Minecraft server console, even though I enabled the whitelist in the
   `server.properties` file.

## The Online Competition Model

In my experience working in CyberPatriot competitions, handling the images
has always been a pain point. In later rounds, they can be up to 6 GB,
meaning they take a long time to download and extract. One competitor
forgetting to download and extract their image can delay start times
by up to 30 minutes. By contrast, the CyberDiscord Open used an online
portal to access competition VMs. This removes download times, makes
multi-instancing violations impossible (see page 34 of the
[CyberPatriot rules](https://www.uscyberpatriot.org/Documents/Training%20Documents/CP15_XV_RulesBook_Final.pdf)),
and allows people to compete without a VMWare-capable device.
**I hope CyberPatriot adopts this model in the future, as it's better for
competition integrity and accessibility.**

## Potential Improvement Areas

1. **Scripting.** Scripts allow competitors to spend more time poking around
   for vulnerabilities and less time doing monotonous tasks like combing
   through log files or removing unauthorized users. Especially with CyberPatriot's
   new four-hour competition period (down from 6), if I want to keep up, I will
   have to script as many things as possible.
2. **Research.** Some topics I want to focus on in the near future are
   [`SELinux`](https://www.redhat.com/en/topics/linux/what-is-selinux)
   (and maybe [`AppArmor`](https://ubuntu.com/server/docs/security-apparmor) on Ubuntu),
   optimally configuring [`PAM`](https://www.redhat.com/sysadmin/pluggable-authentication-modules-pam),
   and the inner workings of [`systemd`](https://systemd.io/). While researching
   during competition is important, background knowledge is essential in
   a time-constrained competition.
3. **Time Management.** In this competition, my team was not able to spend more than
   30 minutes on the web-based challenge because we spent our first few hours on the VMs.
   This dramatically reduced our standing after web challenge scores were posted, because
   every challenge had the same weight in the final score.

## Wrapping Up

The CyberDiscord Open was a ton of fun this year, and I highly
recommend competing in next year's event!

---

_The competition was hosted and organized by Matthew Ring and sponsored by
[AFA CyberPatriot](https://www.uscyberpatriot.org/),
[the National Collegiate Cyber Defense Competition](https://nccdc.org/),
[the Center for Infrastructure Assurance and Security](https://cias.utsa.edu/),
and [MSI](https://msi.com). Thanks to them for making this experience possible!_

> **Update**: A blog post about running the competition has been released! Check it out: https://blog.matthewzring.dev/cyberdiscord/hosting-the-cyberdiscord-open/
