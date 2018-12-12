/* global describe, test, expect, beforeEach */
const NoteraTransportTerminal = require('./index')
const style = require('ansi-styles')

const STYLE_RESET_CTRL_CHAR = '\u001b'
const mockEntry = {
  ctx: 'SERVER',
  level: 'info',
  msg: 'Some stuff\n happened',
  err: new Error('This is a mock error'),
  meta: {
    some: 'meta',
    data: true
  }
}

function getWriteStreamMock () {
  let data = ''

  return {
    write: chunk => (data += chunk),
    read: () => data
  }
}

function getCharOccurences (string, char) {
  return string
    .split('')
    .reduce((sum, c) => sum + (c === char ? 1 : 0), 0)
}

function startsWith (needle, haystack) {
  return haystack.indexOf(needle) === 0
}

function isContaining (needle, haystack) {
  return haystack.indexOf(needle) !== -1
}

let stream

beforeEach(() => {
  stream = getWriteStreamMock()
})

describe('Options', () => {
  test('should print on single line when singleLine option is true', () => {
    const opts = { singleLine: true, stream }
    NoteraTransportTerminal(opts)(mockEntry)
    expect(getCharOccurences(stream.read(), '\n')).toEqual(1)
  })

  test('should not use styling when styling is turned off', () => {
    const opts = { disableStyle: true, stream }
    NoteraTransportTerminal(opts)(mockEntry)
    expect(getCharOccurences(stream.read(), STYLE_RESET_CTRL_CHAR)).toEqual(0)
  })

  test('should change colors', () => {
    const opts = {
      stream,
      colors: {
        info: 'blue'
      }
    }
    NoteraTransportTerminal(opts)(mockEntry)
    const expectedString = style.blue.open + ' INFO' + style.blue.close
    expect(isContaining(expectedString, stream.read())).toEqual(true)
  })

  test('should overwrite a feature of a formatter without overwriting everything', () => {
    const opts = {
      stream,
      segment: {
        ctx: {
          index: 0
        }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    expect(stream.read()).toEqual(expect.stringContaining('[SERVER]'))
  })
})

describe('Formatting', () => {
  test('should use the raw value if no formatter is present', () => {
    const opts = {
      stream,
      segment: {
        ctx: { format: null }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    expect(isContaining('SERVER', stream.read())).toEqual(true)
  })

  test('should be able to reorder formatters by index', () => {
    const opts = {
      stream,
      disableStyle: true,
      segment: {
        ctx: { index: 0 }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    expect(startsWith(' [SERVER]', stream.read())).toEqual(true)
  })

  test('should be able to remove default entry formatters', () => {
    const opts = {
      stream,
      disableStyle: true,
      segment: {
        ctx: null
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    expect(stream.read().indexOf('[SERVER]')).toEqual(-1)
  })

  test('should provide entry and options object', done => {
    const opts = {
      stream,
      disableStyle: true,
      segment: {
        ctx: {
          format: (entry, opts) => {
            expect(entry).toBe(mockEntry)
            expect(opts.disableStyle).toEqual(true)
            done()
          }
        }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
  })
})

describe('Styling', () => {
  test('should be able to set style dynamically with function', () => {
    const opts = {
      stream,
      segment: {
        ctx: {
          style: () => 'blue'
        }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    const expectedString = style.blue.open + ' [SERVER]' + style.blue.close
    expect(isContaining(expectedString, stream.read())).toEqual(true)
  })

  test('should be able to define segment color with color name', () => {
    const opts = {
      stream,
      segment: {
        ctx: {
          style: 'blue'
        }
      }
    }

    NoteraTransportTerminal(opts)(mockEntry)
    const expectedString = style.blue.open + ' [SERVER]' + style.blue.close
    expect(isContaining(expectedString, stream.read())).toEqual(true)
  })
})
