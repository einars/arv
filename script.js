;(function Arv () {

  let input = null

  const elt = (classname) => {
    const elts = document.getElementsByClassName(classname.replace(/^\./, ''))
    if ( ! elts[0] ) {
      throw (`Bug: no ${classname} elts`)
    }
    return elts[0]
  }


  const no_error = () => {
      elt('.js-error').style.display = 'none'
  }

  const error = (message) => {
    elt('.js-error').style.display = 'block'
    elt('.js-error').innerHTML = message
  }


  const init = () => {
    input = elt('.js-file')
    input.addEventListener('change', file_changed, false)
    const drag = elt('.js-dragarea')
    drag.addEventListener('dragenter', file_dragging, false)
    drag.addEventListener('dragover', file_dragging, false)
    drag.addEventListener('drop', file_dropped, false)

    load_sample()
  }

  const nothrow = (f) => (arg = null) => {
    try {
      f(arg)
    } catch (e) {
      console.log({ e })
      error(`${e}`)
      //throw(e)
    }
  }

  const file_dragging = (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
  }

  const file_dropped = nothrow((ev) => {
    ev.preventDefault()
    no_error()

    if (ev.dataTransfer.files.length === 0) {
      error("Nesaņēmu nevienu failu :( Kaut kādas pēdējās Chrome versijas māžojas ar failu dragošanu.")
    } else {
      load_arv(ev.dataTransfer.files[0])
    }
  })

  const file_changed = (ev) => {
    load_arv(ev.target.files[0])
  }

  const load_sample = () => {
    fetch("./sample.arv")
      .then( res => res.blob())
      .then( data => load_arv(new File([data], 'sample.arv')))
  }

  const load_arv = (f) => {
    no_error()
    const reader = new FileReader()
    reader.onload = nothrow((ev) => display(parse_arv(ev.target.result)))
    reader.readAsArrayBuffer(f)
  }

  const parse_arv = (buf /* : ArrayBuffer */) => {
    const v8 = new Uint8Array(buf)
    const v32 = new Uint32Array(buf.slice(0, 12)) // visu nevar, fails var nebūt 32-bit alignots, tapēc tikai biš no sākuma
    const header_offset = v32[2]
    const n_files = v32[1]
    const magic = v32[0]

    // console.debug({ len: v8.length, magic: magic.toString(16), n_files, head: header_offset.toString(16), header_offset })
    if (magic != 0x101) {
      throw `parse_arv: not an arv file (magic=${magic.toString(16)})`
    }
    if (header_offset < 0 || header_offset > v8.length) {
      throw `parse_arv: header_offset ${header_offset} out of bounds`
    }
    if (header_offset + n_files * 548 > v8.length) {
      throw `parse_arv: header_offset ${header_offset} / n_files ${n_files} out of bounds`
    }

    const files = []

    for (let i = 0; i < n_files; i++) {

      const f8 = new Uint8Array(buf.slice(header_offset + i * 548, header_offset + i * 548 + 548))
      const f32 = new Uint32Array(buf.slice(header_offset + i * 548, header_offset + i * 548 + 548))

      let file_name = ''
      for (let j = 0; j < 256; j++) {
        if (f8[j] == 0) break
        file_name += String.fromCharCode(f8[j])
      }

      const size = f32[129]
      const start_offset= f32[130]
      if (start_offset + size > v8.length) {
        throw `parse_arv: ${file_name} out of file bounds`
      }

      let content = ''
      for (let j = 0; j < size; j++) { 
        content += String.fromCharCode(v8[start_offset + j])
      }

      files.push({
        content: 'data:image/jpg;base64, ' + window.btoa(content),
        file_name,
        start_offset,
        size
      })
    }

    return files
  }


  const display = (files) => {

    // console.log({ files })
    const out = elt('.js-output')

    out.innerHTML = ''

    files.forEach( f => {

      const div = document.createElement('div')

      const p = document.createElement('p')
      p.innerHTML = f.file_name

      div.append(p)

      const img = document.createElement('img')
      img.src = f.content
      div.append(img)
      out.append(div)
    } )
  }

  document.addEventListener('DOMContentLoaded', init)

})()

