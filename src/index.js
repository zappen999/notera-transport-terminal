const style = require('ansi-styles')

const LINEBREAK_PATTERN = /\r?\n|\r/g
const ENTRY_KEY = {
  msg: 1,
  err: 1,
  meta: 1,
  level: 1,
  ctx: 1
}

function getOptions (userOpts) {
  const opts = {
    disableStyle: userOpts.disableStyle || false,
    singleLine: userOpts.singleLine || false, // Stack traces will not be shown
    stream: userOpts.stream || process.stdout,
    colors: {
      emerg: 'red',
      alert: 'magenta',
      crit: 'red',
      err: 'red',
      warning: 'yellow',
      notice: 'white',
      info: 'green',
      debug: 'cyan'
    },
    segment: {
      time: {
        index: 10,
        format: _ => new Date().toISOString(),
        style: 'gray'
      },
      ctx: {
        index: 20,
        format: ({ ctx }) => ` [${ctx}]`
      },
      level: {
        index: 30,
        style: ({ level }, opts) => opts.colors[level],
        format: ({ level }) => ' ' + level.toUpperCase()
      },
      msg: {
        index: 40,
        format: ({ msg }) => `: ${msg}`
      },
      err: {
        index: 50,
        format: ({ err }, opts) =>
          ` | ${opts.singleLine ? err.name + ': ' + err.message : err.stack}`,
        style: 'red'
      },
      meta: {
        index: 60,
        format: ({ meta }, opts) =>
          ` | ${JSON.stringify(meta, ...(opts.singleLine ? [] : [null, 2]))}`,
        style: 'gray'
      }
    }
  }

  if (userOpts.colors) {
    for (let color in userOpts.colors) {
      opts.colors[color] = userOpts.colors[color]
    }
  }

  if (userOpts.segment) {
    for (let segmentName in userOpts.segment) {
      if (!userOpts.segment[segmentName]) {
        opts.segment[segmentName] = null
      }

      if (!opts.segment[segmentName]) { // Create the segment if needed
        opts.segment[segmentName] = {}
      }

      for (let feature in userOpts.segment[segmentName]) {
        opts.segment[segmentName][feature] = userOpts.segment[segmentName][feature]
      }
    }
  }

  return opts
}

function NoteraTransportTerminal (userOpts = {}) {
  const opts = getOptions(userOpts)

  const segmentKeys = Object.keys(opts.segment)
    .filter(k => opts.segment[k] !== null)
    .sort((a, b) => opts.segment[a].index > opts.segment[b].index)

  return function transport (entry) {
    let line = segmentKeys
      .filter(key => typeof entry[key] !== 'undefined' || !ENTRY_KEY[key])
      .reduce((l, key) => {
        const segmentConfig = opts.segment[key]

        const segmentText = segmentConfig.format
          ? segmentConfig.format(entry, opts)
          : entry[key]

        const colorName = !opts.disableStyle && segmentConfig.style
          ? (typeof segmentConfig.style === 'function'
            ? segmentConfig.style(entry, opts)
            : segmentConfig.style
          )
          : null

        const styledSegmentText = colorName
          ? style[colorName].open + segmentText + style[colorName].close
          : segmentText

        return l + styledSegmentText
      }, '')

    if (opts.singleLine) {
      line = line.replace(LINEBREAK_PATTERN, '\\n')
    }

    opts.stream.write(`${line}\n`)
  }
}

module.exports = NoteraTransportTerminal
