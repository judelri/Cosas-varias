//go:build windows

// Comparador.exe: abre comparador.html en una ventana propia con WebView2,
// el motor de Edge que ya trae Windows 10 y 11. La página va dentro del .exe.
package main

import (
	_ "embed"
	"net/url"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

//go:embed comparador.html
var pagina []byte

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	shell32          = syscall.NewLazyDLL("shell32.dll")
	pShowWindow      = user32.NewProc("ShowWindow")
	pMessageBoxW     = user32.NewProc("MessageBoxW")
	pSetWindowLongW  = user32.NewProc("SetWindowLongPtrW")
	pCallWindowProcW = user32.NewProc("CallWindowProcW")
	pPostMessageW    = user32.NewProc("PostMessageW")
	pShellExecuteW   = shell32.NewProc("ShellExecuteW")
)

const (
	titulo      = "Comparador de archivos y carpetas"
	wmClose     = 0x0010
	gwlpWndProc = ^uintptr(3) // -4
)

// Teclas del navegador que en una aplicación sobran (recargar, imprimir, atrás/adelante…).
// Solo se anula lo que haría el navegador: la página sigue recibiéndolas para sus atajos.
const sinTeclasNavegador = `addEventListener('keydown',function(e){
  var k=e.key,c=e.ctrlKey||e.metaKey;
  if(k==='F5'||k==='F3'||k==='F7'||k==='F12'||k==='BrowserBack'||k==='BrowserForward'||k==='BrowserRefresh'||
     (e.altKey&&(k==='ArrowLeft'||k==='ArrowRight'||k==='Home'))||
     (c&&/^[rpfgjhnuos]$/i.test(k))||(c&&e.shiftKey&&/^[ijc]$/i.test(k)))e.preventDefault();
},true);
addEventListener('mouseup',function(e){if(e.button===3||e.button===4)e.preventDefault();},true);`

var (
	vista       webview2.WebView
	hwnd        uintptr
	procOrig    uintptr
	puedeCerrar bool
)

// Al cerrar la ventana se pregunta a la página por si hay cambios sin guardar.
func procVentana(h, msg, wp, lp uintptr) uintptr {
	if msg == wmClose && !puedeCerrar && vista != nil {
		vista.Eval(`window.__pedirCierre?window.__pedirCierre():window.cerrarVentana()`)
		return 0
	}
	r, _, _ := pCallWindowProcW.Call(procOrig, h, msg, wp, lp)
	return r
}

func utf16(s string) uintptr {
	p, _ := syscall.UTF16PtrFromString(s)
	return uintptr(unsafe.Pointer(p))
}

func abrir(destino string) {
	pShellExecuteW.Call(0, utf16("open"), utf16(destino), 0, 0, 1)
}

func main() {
	base := filepath.Join(os.Getenv("LOCALAPPDATA"), "Comparador")
	if os.Getenv("LOCALAPPDATA") == "" {
		base = filepath.Join(os.TempDir(), "Comparador")
	}
	_ = os.MkdirAll(base, 0o755)
	html := filepath.Join(base, "comparador.html")
	if err := os.WriteFile(html, pagina, 0o644); err != nil {
		pMessageBoxW.Call(0, utf16("No se pudo preparar la aplicación en "+base+":\n"+err.Error()), utf16(titulo), 0x10)
		return
	}
	dir := (&url.URL{Scheme: "file", Path: "/" + filepath.ToSlash(html)}).String()

	vista = webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:  filepath.Join(base, "WebView2"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title: titulo, Width: 1400, Height: 900, IconId: 1, Center: true,
		},
	})
	if vista == nil {
		r, _, _ := pMessageBoxW.Call(0, utf16("Falta el componente WebView2 de Microsoft, que viene con Windows 10 y 11 actualizados.\n\n"+
			"Sí: abrir la página de Microsoft para instalarlo.\nNo: abrir el comparador en el navegador."), utf16(titulo), 0x34)
		if r == 6 {
			abrir("https://go.microsoft.com/fwlink/p/?LinkId=2124703")
		} else {
			abrir(html)
		}
		return
	}
	defer vista.Destroy()

	hwnd = uintptr(vista.Window())
	procOrig, _, _ = pSetWindowLongW.Call(hwnd, gwlpWndProc, syscall.NewCallback(procVentana))
	pShowWindow.Call(hwnd, 3) // maximizada

	_ = vista.Bind("cerrarVentana", func() {
		vista.Dispatch(func() {
			puedeCerrar = true
			pPostMessageW.Call(hwnd, wmClose, 0, 0)
		})
	})
	vista.Init(sinTeclasNavegador)
	vista.Navigate(dir)
	vista.Run()
}
