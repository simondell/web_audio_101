# Web Audio 101

A drum-machine with basic sequencer to get a feel for launching and mixing sounds, stringing them together in time, building an app rather than a document (because I usually make documents for my day-job, even when they're made like a SPA). Potentially, this project could be used to learn about FRP, as well, as the interface is crying out for better code aesthestics, but this is for a later stage.



## See the demo

Eventually the built site will be hosted somewhere. For now, clone to a local copy.

`$ git clone https://github.com/simondell/web_audio_101.git`

... then run

`$ npm install`
`$ gulp server`

... then point Chrome, Safari or Firefox to

http://localhost:8080 or http://<your_ip>:8080


## Contribute

The app uses Gulp for automated linting, SASS compilation and for serving a test site. Clone the project and run `npm install` , as above. Then run

`$ gulp`

... to build the project, start the server and watch process. An changes to JS, SASS or HTML files will trigger a rebuild of scripts, styles or mark-up portions of the build. JS linting happens automatically, so once the main task is running, errors will show up in the command line log.

Look through the tasks in the gulpfile for individual tasks, like one-off linting.

Make changes in "src/". The project will build to "build/", and that's root directory used by the server.


## Dependancies

1. zepto.Js is used for its selector engine and event binding.



## Licence

The application code is covered by the CC0 1.0 Universal licence. The 3rd party modules (Zepto, Gulp and associated plugins) are all covered by their own licence arrangements. The sound samples are not public domain and potentially infringe some copyright - I don't actually know because I didn't make them and probably downloaded them from a newsgroup in 1998.