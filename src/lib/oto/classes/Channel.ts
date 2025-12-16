import type { Dictionary } from "../types";
import { Split, Gain } from 'tone'
import { CtFXChannel, CtReverbGen, CtFXDelay } from "../ct-synths"

class Channel {
    input
    _busses
    _fxBusses
    _destination
    _out: number
    _fx: any
    _reverb: any
    _delay: any
    _fader: Gain
    _output
    
    constructor(destination: any, out: number = 0) {
        this._destination = destination
        this._out = out

        this.input = new Gain(1)
        this._busses = Array.from({length: 16}, () => new Gain(0))
        this._fxBusses = Array.from({length: 4}, () => new Gain(0))
        this._fader = new Gain(1)
        this._output = new Split({channels: 2})
        
        this._fader.connect(this._output)
        this.input.fan(this._fader, ...this._busses, ...this._fxBusses)
        
        this._output.connect(destination, 0, out)
        this._output.connect(destination, 1, out+1)
    }

    routeOut(out: number) {
        if(out === this._out) return

        this._output.disconnect()
        this._output.connect(this._destination, 0, out)
        this._output.connect(this._destination, 1, out+1)

        this._out = out
    }

    routeBus(bus: number, destination: any) {
        this._busses[bus].connect(destination)
    }

    send(bus: number, gain: number, time: number = 0, lag: number = 10) {
        this._busses[bus].gain.rampTo(gain, lag/1000, time)
    }

    routeFxBus(bus: number, destination: any) {
        this._fxBusses[bus].connect(destination)
    }

    sendFx(bus: number, gain: number, time: number = 0, lag: number = 10) {
        this._fxBusses[bus].gain.rampTo(gain, lag/1000, time)
    }

    set(params: Dictionary, time: number) {
        const { dist = 0, ring = 0, chorus = 0, lpf = 0, hpf = 0, level = 1 } = params;
        
        if(!this._fx) {
            [dist, ring, chorus, lpf, hpf].reduce((a, b) => a + b, 0) > 0 
                && this.initFX()
        }

        params.reverb > 0 && !this._reverb && this.initReverb()
        params.delay > 0 && !this._delay && this.initDelay()
        this._fx && this._fx.set(params, time)
        this._reverb && this._reverb.set(params, time)
        this._delay && this._delay.set(params, time)
        this._fader.gain.rampTo(level, 0.1, time)
    }

    mutate(params: Dictionary, time: number, lag: number = 100) {
        this._fx?.mutate(params, time, lag)
        this._reverb?.mutate(params, time, lag)
        this._delay?.mutate(params, time, lag)
        params.level !== undefined && this._fader.gain.rampTo(params.level, lag/1000, time)
    }

    initFX() {
        this._fx = new CtFXChannel()
        this._handleInternalRouting()
    }

    initDelay() {
        this._delay = new CtFXDelay()
        this._handleInternalRouting()
    }

    initReverb() {
        this._reverb = new CtReverbGen()
        this._handleInternalRouting()
    }

    _handleInternalRouting() {
        const { _fx, _reverb, _delay, input, _fader } = this
        const fx = [_fx, _delay, _reverb]
        
        // disconnect chain
        fx.forEach(fx => fx && fx.disconnect())
        input.disconnect()
        this.input.fan(...this._busses, ...this._fxBusses)

        const first = fx.find(Boolean)
        const last = [...fx].reverse().find(Boolean)
        
        input.connect(first?.input || _fader)
        last?.connect(_fader)

        fx.filter(Boolean).reduce((prev, curr) => {
            prev && curr && prev.connect(curr.input)
            return curr
        }, null)

    }
}

export default Channel