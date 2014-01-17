
(function(){

    Function.prototype.inherit = function(parentClassOrObject){
        if(parentClassOrObject.constructor == Function){
            //Normal Inheritance
            this.prototype = new parentClassOrObject;
            this.prototype.constructor = this;
            this.prototype.parent = parentClassOrObject.prototype;
        }
        else{
            //Pure Virtual Inheritance
            this.prototype = parentClassOrObject;
            this.prototype.constructor = this;
            this.prototype.parent = parentClassOrObject;
        }
        return this;
    };

})();


var polyphony = (function(){

    'use strict';

    var contextClass = window.AudioContext || window.webkitAudioContext,
        context = new contextClass();

    function noteToFrequency(note){

        return 440 * Math.pow(2.0, (note - 69) / 12.0);

    }

    function frequencyToNote(frequency){

        return 69 + (12 * (Math.log(frequency / 440) / Math.LN2));

    }

    function Subscriber(){

        this.on = function(eventName, handler){
            this.handlers = this.handlers || {};
            this.handlers[eventName] = this.handlers[eventName] || [];
            this.handlers[eventName].push(handler);
        }

        this.off = function(eventName, handler){
            this.handlers = this.handlers || {};
            this.handlers[eventName] = [];
        }

        this.fire = function(eventName){
            this.handlers = this.handlers || {};
            if(this.handlers[eventName]){
                var handlersLength = this.handlers[eventName].length;
                for(var i = 0; i < handlersLength; i++){
                    this.handlers[eventName][i].apply(this, Array.prototype.slice.apply(arguments, [1]));
                }
            }
        }

    }

    function Note(onEnd){

        this.up = function(){
            this.fire('up');
        };

        this.on('up', onEnd);

    }
    Note.inherit(Subscriber);

    var modules = {

        Oscillator : function(){

            var oscillator = context.createOscillator(),
                gain = context.createGainNode();

            oscillator.type = 2;
            oscillator.connect(gain);
            oscillator.detune.value = 0; //cents
            oscillator.frequency.value = 110;
            oscillator.noteOn(0);

            gain.gain.value = 0; //0 to 1

            Object.defineProperty(this, 'type', {
                get: function(){
                    return oscillator.type;
                },
                set: function(type){
                    oscillator.type = type;
                }
            });

            Object.defineProperty(this, 'detune', {
                get: function(){
                    return oscillator.detune.value;
                },
                set: function(value){
                    oscillator.detune.value = value;
                }
            });

            Object.defineProperty(this, 'frequency', {
                get: function(){
                    return oscillator.frequency.value;
                },
                set: function(value){
                    oscillator.frequency.value = value;
                }
            });

            Object.defineProperty(this, 'note', {
                get: function(){
                    return frequencyToNote(oscillator.frequency.value);
                },
                set: function(value){
                    oscillator.frequency.value = noteToFrequency(value);
                }
            });

            Object.defineProperty(this, 'gain', {
                get: function(){
                    return gain.gain;
                },
                set: function(value){
                    gain.gain.value = value;
                }
            });

            this.connect = function(out){
                gain.connect(out);
            };

        },

        Filter : function(){

            var filter = context.createBiquadFilter();

            filter.type = 0;
            filter.Q.value = 0; //1 to 1000
            filter.detune.value = 0;
            filter.frequency.value = 440;
            filter.gain.value = 1; //db -40 to 40

            Object.defineProperty(this, 'type', {
                get: function(){
                    return filter.type;
                },
                set: function(type){
                    filter.type = type;
                }
            });

            Object.defineProperty(this, 'frequency', {
                get: function(){
                    return filter.frequency.value;
                },
                set: function(value){
                    filter.frequency.value = value;
                }
            });

            Object.defineProperty(this, 'note', {
                get: function(){
                    return noteToFrequency(filter.frequency.value);
                },
                set: function(value){
                    filter.frequency.value = noteToFrequency(value);
                }
            });

            Object.defineProperty(this, 'input', {
                get: function(){
                    return filter;
                }
            });

            this.connect = function(out){
                filter.connect(out);
            };

        },

        Delay : function(){

            var delay = context.createDelayNode(),
                inputBuffer = context.createGainNode(),
                feedbackLevel = context.createGainNode(),
                outputBuffer = context.createGainNode();

            delay.delayTime.value = 0.5;
            inputBuffer.gain.value = 1;
            feedbackLevel.gain.value = 0;
            outputBuffer.gain.value = 1;

            inputBuffer.connect(outputBuffer);
            inputBuffer.connect(delay);
            delay.connect(feedbackLevel);
            delay.connect(outputBuffer);
            feedbackLevel.connect(delay);

            Object.defineProperty(this, 'delayTime', {
                get: function(){
                    return delay.delayTime.value;
                },
                set: function(value){
                    delay.delayTime.value = value;
                }
            });

            Object.defineProperty(this, 'feedback', {
                get: function(){
                    return feedbackLevel.gain.value;
                },
                set: function(value){
                    feedbackLevel.gain = value;
                }
            });

            Object.defineProperty(this, 'input', {
                get: function(){
                    return inputBuffer;
                }
            });

            this.connect = function(out){
                outputBuffer.connect(out);
            };

        },

        Sample : function(){

            var buffer = null,
                bufferSource = null,
                mediaElement = null,
                mediaElementSource = null,
                level = context.createGainNode();

            level.gain.value = 1;

            this.root = 67; //C4

            this.load = function(arrayBuffer){
                try{
                    buffer = context.createBuffer(arrayBuffer, false);
                }
                catch(exception){
                    console.error('unable to load audio: '+exception.message);
                    buffer = null;
                }
            };

            this.down = function(note){

                if(buffer){
                    if(bufferSource){ bufferSource.noteOff(0); }
                    bufferSource = context.createBufferSource();
                    bufferSource.connect(level);
                    bufferSource.buffer = buffer;
                    bufferSource.playbackRate.value = noteToFrequency(note) / noteToFrequency(this.root);
                    bufferSource.noteOn(0);
                }

            };

            this.connect = function(out){
                level.connect(out);
            };

        },

        ADSR : function(){

            var out;

            this.level = 1;
            this.a = 0.5;
            this.d = 30;
            this.s = 0.2;
            this.r = 0.5;

            var up = function(){

                var now = context.currentTime;
                out.cancelScheduledValues(now);
                out.setValueAtTime(out.value, now);
                //out.exponentialRampToValueAtTime(0, now + r);
                out.linearRampToValueAtTime(0, now + this.r);


            }.bind(this);

            this.down = function(){

                var now = context.currentTime;
                out.cancelScheduledValues(now);
                out.setValueAtTime(out.value, now);
                //out.exponentialRampToValueAtTime(level, now + a);
                out.linearRampToValueAtTime(this.level, now + this.a);
                out.setTargetAtTime(this.s * this.level, now + this.a, this.d);
                return new Note(up);

            }

            this.connect = function(param){

                out = param;
                out.value = 0;

            }

        },

        Portamento : function(){

            var out

            this.speed = 0;

            function set(note){

                var now = context.currentTime;
                out.cancelScheduledValues(now);
                out.setValueAtTime(out.value, now);
                out.exponentialRampToValueAtTime(val, now + this.time);

            }

            Object.defineProperty(this, 'note', {
                get: function(){
                    return noteToFrequency(filter.frequency.value);
                },
                set: function(value){
                    filter.frequency.value = noteToFrequency(value);
                }
            });

            Object.defineProperty(this, 'frequency', {
                get: function(){
                    return filter.frequency.value;
                },
                set: function(value){
                    filter.frequency.value = value;
                }
            });

            this.connect = function(param){

                out = param;

            }

        }

    };

    /* -------------------------------------------------- */

    function Synth(build){

        this.output = context.createGainNode();
        this.output.gain.value = 1;

        this.clone = function(){

            return new Synth(build);

        }

        var up = function(){

            this.fire('noteup');

        }.bind(this);

        this.down = function(note){

            this.fire('notedown', note);
            return new Note(up);

        }

        this.connect = function(output){

            this.output.connect(output);

        }

        build.apply(this, [modules]);

    }
    Synth.inherit(Subscriber);

    function Bank(synth, voices){

        var gain = context.createGainNode(),
            bank = [],
            register = [];

        gain.gain.value = 1;

        for(var i = 0; i < voices; i++){
            var voice = synth.clone();
            voice.connect(gain);
            bank.push(voice);
            register.push(0);
        }

        this.down = function(note){

            var out = null; // find empty or oldest

            for(var i = 0; i < voices; i++){
                if(register[i] === 0){
                    out = i;
                    break;
                }
                out = out ?
                    register[i] < register[out] ?
                        i :
                        out :
                    i;
            }

            register[out] = context.currentTime;
            return bank[out].down(note);

        }

        this.connect = function(output){

            gain.connect(output);

        }

    }

    /* -------------------------------------------------- */

    var containers = {
        Bank        : Bank,
        Synth       : Synth,
        out         : context.destination
    }

    return function(build){

        build.apply(this, [containers]);

    }

})();