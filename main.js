const path = require('path')
const os = require('os')
// BrowserWindow is a class used to create desktop windows
// Menu for bringing in App menu from electron, by default its already but for a customized menu we do this.
// globalShortcut i.e Ctrl+R to reload or Ctrl+Shift+I to open devtools
// ipcMain to recieve data send from index.html
// shell to manipulate folders
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const slash = require('slash')
const log = require('electron-log')
const { exception } = require('console')

// set environment
process.env.NODE_ENV = 'production'
const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false //for checking macOS or not since we want this to be cross-platfrom app.

let mainWindow
let aboutWindow

function createMainWindow () {
    mainWindow = new BrowserWindow({
        title: 'Image Re-Sizer',
        width: isDev? 1000 : 500,
        height: 600,
        resizable: isDev ? true : false,
        icon: './assets/icons/Icon_256x256.png',
        webPreferences: {
            nodeIntegration: true,
        },
    })

    if (isDev) {
        mainWindow.webContents.openDevTools()
    }
    // mainWindow.loadURL(`https://twitter.com`) 
    // this is how we can load url in our window, i.e above statement open twitter in our window

    // mainWindow.loadURL(`file://${__dirname}/app/index.html`) alternate way
    mainWindow.loadFile('./app/index.html')
}

function createAboutWindow () {
    aboutWindow = new BrowserWindow({
        title: 'About',
        width: 350,
        height: 300,
        resizable: false,
        icon: './assets/icons/Icon_256x256.png',
    })
    aboutWindow.loadFile('./app/about.html')
}

app.on('ready' , () => {
    createMainWindow()

    // using the menu we created below
    const mainMenu = Menu.buildFromTemplate(menu)
    Menu.setApplicationMenu(mainMenu)

    // for making global shortcuts
    // globalShortcut.register('CmdOrCtrl+R' , () => mainWindow.reload())
    // globalShortcut.register(isMac ? 'Command+Alt+I' : "Ctrl+Shift+I", () => mainWindow.toggleDevTools())

    mainWindow.on('ready' , () => mainWindow = null)
})

const menu = [
    {
        // for customized File Menu
        // label: 'File',
        // submenu: [
        //     {
        //         label: 'Quit', 
        //         accelerator: 'CmdOrCtrl+W', // keyboard shortcut for quit, for both mac and win.
        //         click: () => app.quit() // on click app quits
        //     },
        // ]
        role: 'fileMenu'  //gives a standard file menu   
    },
    { role: 'editMenu' }, //gives a standard edit menu 
    ...(isDev ? [
        {
            label: 'Developer',
            submenu: [
                {role: 'reload'},
                {role: 'forcereload'},
                {type: 'separator'},
                {role: 'toggleDevTools'},
            ]
        }
    ] : []),
    ...(!isMac ? [
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        createAboutWindow()

                        const aboutMenu = Menu.buildFromTemplate(aboutmenu = [])
                        Menu.setApplicationMenu(aboutMenu)
                    },
                }
            ]
        }
    ] : []),

]

ipcMain.on('image:minimize', (e,options) =>{
    options.dest = path.join(os.homedir(),'imageshrink') //destination path
    shrinkImage(options)
} )

async function shrinkImage({ imgPath, quality, dest }){
    const pngQuality = quality/100
    try {
        const files = await imagemin( [slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({quality}),
                imageminPngquant({
                    quality: [pngQuality, pngQuality ]
                })
            ]
        })

        // console.log(`sourcePath: ${files[0].sourcePath}`, `\ndestinationPath: ${files[0].destinationPath}`)
        log.info(`[\n   {\n     sourcePath: ${files[0].sourcePath}`, `\n     destinationPath: ${files[0].destinationPath}\n    }\n]`)

        shell.openPath(dest) // to open destination folder after resizing

        mainWindow.webContents.send('image:done') // send alert to index.html
    } catch (err) { // to catch an error
        log.error(err)
    }
}

app.allowRendererProcessReuse = true