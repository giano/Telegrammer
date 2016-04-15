<!-- language: lang-none -->

    ╔╦╗┌─┐┬  ┌─┐┌─┐┬─┐┌─┐┌┬┐┌┬┐┌─┐┬─┐
     ║ ├┤ │  ├┤ │ ┬├┬┘├─┤││││││├┤ ├┬┘
     ╩ └─┘┴─┘└─┘└─┘┴└─┴ ┴┴ ┴┴ ┴└─┘┴└─

Manage your device or server using [**Telegram Messenger**](https://telegram.org/). Two way communication!

--------------------------------------------------------------------------------

![Travis Build](https://travis-ci.org/giano/Telegrammer.svg) ![Dependencies](https://david-dm.org/giano/Telegrammer.svg)

# Synopsis
Telegrammer is a little resident server born to allow easy device/server management via private Telegram chat.

It allows two-way communication using a registered Telegram Bot.

Actually Telegrammer allows device/server monitoring, device/server shell scripts and node functions execution, GPIO signaling (in/out), command line and web triggers to send message to the Bot chat.

_**Making IT simple?** Chat with your **server** or **device**. It will chat to you too :)_

# Installation
## Cloning/Forking this repository
Step **one** is cloning or forking this repository in a directory on your computer, server or device.

You can get using _npm_ too.

![npm install telegrammer](https://nodei.co/npm/telegrammer.png?downloads=true&stars=true)

Then _npm install_ as usual.

You can install globally too (or _npm link_ it). In this case You'll have a nice "telegrammer" executable in your bin folder to launch this software.

## Chatting with a BotFather
Next step is creating a Bot on Telegram and obtain an authorization token. You'll have to chat with a special Bot called **BotFather** to register your Bot.

Just follow [this guide](https://core.telegram.org/bots) to authorize your Bot.

**Keep in mind that actually only one instance of Telegrammer can be linked to a Bot (Telegram limitation), so if you need to monitor _two_ devices you'll have to register _two_ Bots. Then you can create a "group chat" with all your Bots to manage all the devices at once.**

## So you obtained your token, isn't it?
You chatted with the BotFather and it made you an offer you can't refuse. Well...that went straight. Now open example config file you'll find in config folder, put your token here and save the file as shared.json.

You can override some values using **NODE_ENV**.json files in the same directory (_development.json, production.json, etc..._)

You can limit Telegrammer to respond only to certain usernames for extra security, or let it respond to anyone removing this property.

Put your Chat ID too. You can obtain it chatting with your bot and reading console output. If you don't specify it Telegrammer will try autoset it on first received message.

**Keep in mind that monitoring, command-line and web hook will not work until Chat ID is set.**

You can disable some services to lower memory consumpion (on devices like Raspberry Pi, for example) or for extra security.

> You can use this file to config your Hooks too.

# Hooks? Sounds painful.
So what the heck are those Hooks?

You can call them **plugins** if your heart's content. You can find some in the **hooks/** directory. Those are the files you'll use to define your commands (in/out) and monitoring services. Telegrammer will load all the **.js** and **.json** files in **hooks/** subfolder and, after checking it's actually an hook definition, will "hook" it.

_You can define different kinds of hooks, and the same hook can "activate" many of them at once (for example monitoring a disk, sending you a message if disk space is low, and reacting to your command clearing it)._

> The syntax is simple but powerful, I promise you that.

## Input Hook (local command)
**Those hooks are waiting for you to text them!** They will react to a command or regex and act accordingly, running a node function, a GPIO sequence (_if you are on a device like a Raspberry Pi_), a shell command or script. Then Telegrammer will send you back a result or error.

You need to define some properties:
- either **command** or **match**. Your bot will react to the string defined in **command** preceded by **/** (so if you write 'blow_candles' it will react to '/blow_candles'), or to the regex pattern you'll define in match.
- either **action** (that can be a string containing a shell command or a node function returning a _Promise_), **shell** (with the name of an executable in the same directory), a **signal** (that can be an array defining a GPIO pattern, an array of array of GPIO signals for multi PIN parallel signaling or a function returning a _Promise_) or a function named **parse_response** for "confirmation enabled" hooks.
- a **response** and **error** strings. You can use some variables too (@error@ and @response@) to include action output/error.

> Most of the defined functions require you to return a Promise. Telegrammer will send you back to the chat anything you will output "resolving" or "rejecting" your Promise, unless you define **response: false** in your hook or resolve with **null**. Just remember to resolve or reject your Promises, or the **BotFather** will be very unhappy and you'll risk finding a sawed horse's head in your bed.

All the hooks can define **name** and **namespace** properties, or those will be inferred using path and file name. You should define a **description** too, and an **help** that will be shown on home page or command line manual.

## Web Hook (http triggered command)
**Those hooks are waiting for you to "trigger" them POSTing or GETting webpages!** They will react to a specific express route, activate and send you a chat message.

You can use those hooks to create a "central dispatcher" server for a little network and trigger hooks from remote machines.

> You can have a little of extra security configuring **auth_token_name** and **auth_token** in your config file. Then you'll need to add this extra header to every request to trigger the Hooks.

You need to define some properties:
- a **route** function that will execute your code and that responds to a route path and executes some code. I must returns a Promise. It will receive an object **params** with the params you defined in your hooks, the Telegrammer api (you can use it to send any message you want) and request & response objects. Your page will answer with your "resolve" param, unless you return null.
- Optionally the **route_path** or it will be generated using namespace/name of the hook.
- Optionally a **params** key defining expected GET or POST params following [Command Line Args](https://github.com/75lb/command-line-args.git) syntax.

## Command Line Hook (bash callable commands)
**Those hooks are waiting for you to "trigger" them calling them by name!** They will react to a specific command line inputs, using '_git-like_' syntax and named parametes.

You can use those hooks to react to system events, cron jobs or daemon/application calling.

You can use **./tel.sh** script or the **index.js** file to execute them.

> You can ask for help on defined commands and params using the command line interface you can read in the next chapter.

You need to define some properties:
- an **exec** function that will execute your code and will executes some code and returns a Promise. Will receive an object **params** with the params you defined in your hooks and the Telegrammer api (you can use it to send any message you want). Telegrammer will send in chat any value you will "resolve".
- Optionally the **cmd_name** or it will be generated using namespace/name of the hook.
- Optionally a **params** key defining expected params following [Command Line Args](https://github.com/75lb/command-line-args.git) syntax.

## Monitor Hook (monitoring commands)
**Those hooks will "trigger" themself whenever they want!** They will react check at specified intervals something or react to GPIO inputs.

You can use those hooks to monitor cpu usage, disk space, file/directories changing or GPIO input if you are on a "Raspberry Pi" like device.

> Monitoring hooks can be CPU/memory consuming. Consider using large intervals.

You need to define some properties:
- an **interval** expressed in milliseconds. Your check will be called every _interval_ milliseconds.
- a **check** function that will return a Promise. As always any param you'll pass to your "resolve" will be texted by the Bot. Your function will receive **hook** and Telegrammer **api** arguments, or a **start_monitor** and **stop_monitor** functions if you are feeling risky.
- or a **gpio** object with pin id and an handler to monitor GPIO events. Your handler will receive **err**or code, pin read **value**, **hook** reference and Telegrammer **api**. Any param you'll pass to your "resolve" will be texted by the Bot.

> You can find some examples in the hooks/examples directory. Feel free to trash it when you feel more confident on Hook definition.

# Run (for your life)
You can run the server using three (or four) alternatives:

```
npm start
```

```
node index.js start
```

or you can use the little shell script tel.sh

```
./tel.sh start
```

If you installed it globally (-g) or _npm link_-ed it you can access to it from your console using the executable in your bin folder as this:

```
telegrammer start
```

Feel free to **daemonize** Telegrammer. You can later stop the server just executing:

```
./tel.sh stop
```

or

```
node index.js stop
```

or

```
telegrammer stop
```

# Making it run...

You can make your Telegrammer start at device/server boot in many ways. My favourite one is **systemd**. You can create a file named **telegrammer.service** in your **/etc/systemd/system/** folder with this content (replace installation path, npm path and environment variables with yours, of course).

```
[Service]
WorkingDirectory=/your/path/to/telegrammer
ExecStart=/usr/local/bin/npm start
ExecStop=/usr/local/bin/npm run-script stop
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=telegrammer
User=root
Group=root
Environment=NODE_ENV=development
Environment=MAX_MEM=128
After=network.target local-fs.target
PIDFile=/your/path/to/telegrammer/.pid

[Install]
WantedBy=multi-user.target
```

Then enable it:

```
sudo systemctl enable telegrammer
```

That way your service will boot at start, after network is available, and you can start and stop telegrammer using **systemd**:

```
sudo systemctl start telegrammer
```

```
sudo systemctl stop telegrammer
```

```
sudo systemctl restart telegrammer
```
> You can use your *rc.local* file too, but I found it less reliable.

# Configure
Telegrammer can be configured in a _plètora_ of ways. You can pass arguments when you start it, set environment variables, use a config file in your home folder or use the specific _environment-cascading_ folder.

Specifically "base" arguments (usable on every command) are:

| Command      | Short | Description                                                              |
|--------------|:-----:|--------------------------------------------------------------------------|
| --verbose    |   -V  | _Set verbosity on or off_                                                |
| --telegramid |   -T  | _Set Telegram chat ID_                                                   |
| --token      |   -K  | _Set Bot token_                                                          |
| --config-file|       | _Set config file path (ignore config dir option)_                        |
| --config-dir |       | _Set config dir (useful when you install Telegram as global npm module)_ |
| --hooks-dir  |       | _Set hooks dir (useful when you install Telegram as global npm module)_  |
| --log-file   |       | _Set log file path_                                                      |

You can set some of those using environment variables too:

| Env Variable   | Description            |
|----------------|------------------------|
| TEL_CONFIG_DIR | _Set config dir_       |
| TEL_HOOKS_DIR  | _Set hooks dir_        |
| TEL_CID        | _Set Telegram chat ID_ |
| TEL_TOKEN      | _Set Bot token_        |

When Telegrammer starts will try to load a .js (or .json) file named ".telegrammer.js" (or ".telegrammer.json") in your home folder (for _unix talkers_ something like ~/.telegrammer.json). You can use this file to store your token or "base config".

> Keep in mind that if you launch Telegrammer using a _root_ bash script (like, for example, _/etc/rc.local_) you need to put this file in _root_'s home folder.

Then Telegrammer will read "shared.js" (or "shared.json") in your config folder (overriding "home file" values) and, as last step, environment specific files in the same folder (production.js, production.json, development.js, etc...)

> You can set hooks directory in config files too, using absolute path names or relative (to Telegrammer folder) ones.

# Help!
If Express is on you can navigate to your Telegrammer home page (**localhost:express_port**) to explore all hooks definitions. Standard port is 3000, but you can write in config or use PORT environment variable to control it.

You can have a little help using command line interface:

```
./tel.sh help
```

or

```
node index.js help
```

or

```
telegrammer help
```

and following instructions.

**Your help output will include installed command line hooks, so it may change.**

> You can also read JsDocs generated documentation in the docs directory.

# Issues
As noted before you'll have to register a different Telegram Bot for every Telegrammer instance running as a server. It can be **boooring** (expecially as Bot names will fill up), but _no way out from this hell at the moment_.

Consider disabling **express manager** and **web hooks** on _memory-frugal_ devices. Those are the most "memory consuming" managers.

# Team
- Stefano "Giano" Valicchia - [LinkedIn](https://it.linkedin.com/in/stefanovalicchia) - [Github](https://github.com/giano) - [Twitter](https://twitter.com/tulo69) - [Npm](https://www.npmjs.com/~giano)

# License
MIT License

Copyright (c) 2016 Stefano Valicchia

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# Contributing
Feel free to fork, improve, modify and patch this code.
