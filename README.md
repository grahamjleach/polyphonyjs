
# polyphony.js

> **Alpha** synthesizer tools for web

The goal of this library is to provide a tool kit for building synth applications for web, wrapping the AudioContext
object and providing an interface that should be more familiar and resonant to synthesizer users.
Also, as the name indicates, it will provide a way to bank synthesized voices so that they can be played polyphonically.


## Workspaces

> Polyphony > Container > Modules

Polyphony.js uses a 2 level workspace pattern, in each workspace a different component set is availed.

```js
polyphony(function(container){

    var voice = new container.Voice(function(modules){

        var module = new modules.Oscillator();
        module.connect(this.output);

    });

    var bank = new container.Bank(voice, 4);
    bank.connect(container.out);

    /* Your UI Bindings... */

});
```

## polyphony

polyphony method accepts as its sole argument a method which scope-contains your workspace.
method is passed the **container** component set.

### container

container holds three elements:

`container.Voice`

the Voice class constructor accepts a method which contains the workspace for that instance and is passed
the **modules** component set.

`container.Bank`

the Bank class constructor accepts as arguments a voice instance and an integer indicating the number of voices
to be duplicated.

`container.out`

a reference to AudioContext.destination

### modules

modules should accept as argument and object containing initial values.

`modules.Oscillator`

`modules.Filter`

`modules.Delay`

`modules.Sample`

`modules.ADSR`

`modules.Portamento`