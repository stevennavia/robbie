#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::{AppHandle, Manager, PhysicalSize, RunEvent, Size, WindowEvent};

#[derive(Default)]
struct ManagedServer(Mutex<Option<Child>>);

fn start_server(app: &AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }

    let Ok(resource_dir) = app.path().resource_dir() else {
        eprintln!("[robbie] No se pudo localizar el directorio de recursos");
        return;
    };

    let candidates = [
        resource_dir.join("apps/server/dist/index.js"),
        resource_dir.join("server/index.js"),
    ];
    let Some(entry) = candidates.into_iter().find(|path| path.exists()) else {
        eprintln!("[robbie] No se encontró el servidor compilado en los recursos");
        return;
    };

    let working_directory = entry.parent().map(PathBuf::from);
    let mut command = Command::new("node");
    command.arg(entry).env("NODE_ENV", "production");
    if let Some(directory) = working_directory {
        command.current_dir(directory);
    }

    match command.spawn() {
        Ok(child) => {
            if let Some(server) = app.try_state::<ManagedServer>() {
                if let Ok(mut managed) = server.0.lock() {
                    *managed = Some(child);
                }
            }
        }
        Err(error) => eprintln!("[robbie] No se pudo iniciar el servidor local: {error}"),
    }
}

fn stop_server(app: &AppHandle) {
    if let Some(server) = app.try_state::<ManagedServer>() {
        if let Ok(mut managed) = server.0.lock() {
            if let Some(mut child) = managed.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

fn set_robbie_visible(app: &AppHandle, visible: bool) {
    let Some(robbie) = app.get_webview_window("robbie") else {
        return;
    };

    if visible {
        let _ = robbie.unminimize();
        let _ = robbie.show();
    } else {
        let _ = robbie.hide();
    }
}

#[tauri::command]
fn focus_dashboard(app: AppHandle) -> Result<(), String> {
    let dashboard = app
        .get_webview_window("dashboard")
        .ok_or_else(|| "No se encontró la ventana dashboard".to_string())?;
    dashboard.show().map_err(|error| error.to_string())?;
    dashboard.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn show_robbie_window(app: AppHandle) -> Result<(), String> {
    let robbie = app
        .get_webview_window("robbie")
        .ok_or_else(|| "No se encontró la ventana robbie".to_string())?;
    robbie.unminimize().map_err(|e| e.to_string())?;
    robbie.show().map_err(|e| e.to_string())?;
    robbie.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_robbie_size_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let robbie = app
        .get_webview_window("robbie")
        .ok_or_else(|| "No se encontró la ventana robbie".to_string())?;
    let size = match mode.as_str() {
        "compact" => PhysicalSize::new(128, 64),
        "hardware" => PhysicalSize::new(280, 240),
        _ => return Err(format!("Modo de tamaño desconocido: {mode}")),
    };
    robbie.set_size(Size::Physical(size)).map_err(|error| error.to_string())
}

fn main() {
    let app = tauri::Builder::default()
        .manage(ManagedServer::default())
        .invoke_handler(tauri::generate_handler![
            focus_dashboard,
            show_robbie_window,
            set_robbie_size_mode,
        ])
        .setup(|app| {
            start_server(app.handle());
            set_robbie_visible(app.handle(), false);

            let toggle = MenuItem::with_id(app, "toggle", "Ocultar Robbie", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &quit])?;

            let _tray = TrayIconBuilder::with_id("robbie-tray")
                .tooltip("Robbie")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("robbie") {
                            let new_label = if window.is_visible().unwrap_or_default() {
                                let _ = window.hide();
                                "Mostrar Robbie"
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                "Ocultar Robbie"
                            };
                            let _ = toggle.set_text(new_label);
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("robbie") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Robbie");

    app.run(|app, event| {
        match event {
            RunEvent::WindowEvent { label, event, .. } if label == "dashboard" => {
                if let WindowEvent::Focused(focused) = event {
                    set_robbie_visible(app, !focused);
                }
            }
            RunEvent::Exit => stop_server(app),
            _ => {}
        }
    });
}
