import { Merge, getDestination, Limiter, Gain } from 'tone'
import Channel from './classes/Channel'
import type { Dictionary } from './types'

// Limiter
const limiter = new Limiter({threshold: -20})

// Output
const destination = getDestination()
destination.channelCount = destination.maxChannelCount
destination.channelCount === 2 && destination.chain(limiter)

export const output = new Merge({channels: destination.maxChannelCount})
output.connect(destination)

export const busses = Array.from({length: 16}, () => new Gain(1))

// FX channel strips, connected by a bus from all channels
export const fxChannels: Dictionary = {
    fx0: new Channel(output, 0),
    fx1: new Channel(output, 0),
    fx2: new Channel(output, 0),
    fx3: new Channel(output, 0),
}

// instrument channels strips, placed at the head of each stream
const channels: Dictionary = {}

export const getChannel = (channel: number, out: number) => {
    // if the channel strip doesn't exist, make it
    if(!channels[channel]) {
        channels[channel] = new Channel(output, out);

        // connect all channels to the busses
        busses.forEach((bus: Gain, i: number) => {
            channels[channel].routeBus(i, bus)
        });

        // connect all fx buses to the input of the fx channels
        ['fx0', 'fx1', 'fx2', 'fx3'].forEach((id: string, i: number) => {
            channels[channel].routeFxBus(i, fxChannels[id].input)
        });
        channels[channel].routeOut(out)
    }
    
    // return the channel strip
    return channels[channel]
}

