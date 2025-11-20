# Testing Tizen App with Simulator

This guide explains how to test the Tizen WGT package using the Samsung TV Simulator.

## Prerequisites

### 1. Install Tizen Studio

Download and install Tizen Studio from:
https://developer.tizen.org/development/tizen-studio/download

### 2. Install Required Packages

Open Tizen Studio Package Manager and install:
- **TV Extensions-6.5** (or latest)
- **Samsung Certificate Extension**
- **TV Emulator** (under TV Extensions)
- **Baseline SDK** (required for TV development)

### 3. Add Tizen CLI to PATH

Add the Tizen CLI tools to your PATH:

```bash
# For macOS/Linux - add to ~/.zshrc or ~/.bashrc
export TIZEN_STUDIO_HOME="$HOME/tizen-studio"
export PATH="$PATH:$TIZEN_STUDIO_HOME/tools/ide/bin:$TIZEN_STUDIO_HOME/tools"

# Reload your shell
source ~/.zshrc
```

## Building the WGT Package

### 1. Build the Web Export

```bash
cd apps/expo-multi-tv
yarn export:tizen
```

This will create the `tizen-build` directory with all necessary files.

### 2. Create Certificate (First Time Only)

```bash
# Create author certificate
tizen certificate -a MyTizenProfile -p yourpassword -c US -s Seoul -ct Seoul -o "Your Company" -n "Your Name" -e your.email@example.com

# Create security profile
tizen security-profiles add -n MyTizenProfile -a $HOME/tizen-studio-data/keystore/author/MyTizenProfile.p12 -p yourpassword
```

### 3. Package the App

```bash
# Package the WGT file
tizen package -t wgt -s MyTizenProfile -- tizen-build

# The output will be: MultiTVExpoApp.wgt
```

## Testing with Tizen TV Simulator

### Method 1: Using Tizen Studio IDE (GUI)

1. **Launch Tizen Studio**
   - Open Tizen Studio IDE

2. **Create/Import Project**
   - File → Open Projects from File System
   - Select the `tizen-build` directory
   - Or create a new TV Web Project and copy your files into it

3. **Launch Emulator Manager**
   - Tools → Emulator Manager
   - Or run from command line: `emulator-manager`

4. **Create TV Emulator**
   - Click "Create" button
   - Select TV platform (e.g., TV-samsung-6.5)
   - Choose device template (e.g., "UHD (3840x2160)")
   - Click "Confirm"

5. **Launch Emulator**
   - Select your created emulator
   - Click "Launch" button
   - Wait for emulator to boot (this may take a few minutes)

6. **Install and Run App**
   - Right-click on project → Run As → Tizen Web Application
   - Or use CLI (see Method 2 below)

### Method 2: Using CLI (Recommended for Automation)

1. **List Available Emulator Images**
   ```bash
   emulator-manager list-vm
   ```

2. **Create an Emulator Instance**
   ```bash
   # Create a TV emulator (6.5 is the version, adjust as needed)
   tizen create emulator-manager -n MyTVEmulator -p tv-samsung-6.5 -t 1920x1080
   ```

3. **List Available Emulators**
   ```bash
   emulator-manager list
   ```

4. **Launch the Emulator**
   ```bash
   # Launch by name
   emulator-manager launch --name MyTVEmulator

   # Or using the emulator CLI directly
   $TIZEN_STUDIO_HOME/emulator/bin/em-cli launch --name MyTVEmulator
   ```

5. **Wait for Emulator to Boot**
   - The emulator window will appear
   - Wait until you see the Samsung TV home screen
   - This may take 2-5 minutes on first launch

6. **Check Available Devices**
   ```bash
   sdb devices
   # Should show something like:
   # emulator-26101  device  MyTVEmulator
   ```

7. **Install the WGT Package**
   ```bash
   # Using the emulator name from sdb devices
   tizen install -n MultiTVExpoApp.wgt -t emulator-26101
   ```

8. **Launch the App**
   ```bash
   # Launch using the app ID from config.xml
   tizen run -p MultiTVExpoApp -t emulator-26101
   ```

## Troubleshooting

### Emulator Not Showing in sdb devices

```bash
# Check SDB server status
sdb kill-server
sdb start-server
sdb devices
```

### Emulator Launch Fails

```bash
# Try launching with more verbose output
emulator-manager launch --name MyTVEmulator --verbose

# Or check if virtualization is enabled (macOS)
sysctl kern.hv_support

# For Linux, check KVM
kvm-ok
```

### Installation Fails

1. **Check certificate is valid:**
   ```bash
   tizen security-profiles list
   ```

2. **Ensure app is signed:**
   ```bash
   # Re-package with signing
   tizen package -t wgt -s MyTizenProfile -- tizen-build
   ```

3. **Check logs:**
   ```bash
   # View device logs
   sdb dlog

   # Filter for your app
   sdb dlog | grep MultiTV
   ```

### App Crashes or Doesn't Load

1. **Check Remote Inspector (Chrome DevTools)**
   ```bash
   # Get emulator IP
   sdb devices -l

   # Open Chrome and navigate to:
   chrome://inspect

   # Or directly to Samsung Remote Inspector:
   http://<EMULATOR_IP>:9999
   ```

2. **View Console Logs:**
   - The Tizen Studio also has a built-in Web Inspector
   - Tools → Web Inspector
   - Connect to your running app

## Using Tizen Web Simulator (Alternative)

For quick testing without full emulator:

1. **Launch Web Simulator**
   ```bash
   # From Tizen Studio
   Tools → Web Simulator
   ```

2. **Load Your App**
   - File → Open → Select `tizen-build/index.html`
   - The simulator provides a quick preview with TV remote controls

3. **Test Navigation**
   - Use the virtual remote on the right side
   - Test focus management and key events

**Note:** The Web Simulator is faster but less accurate than the full emulator. Use it for quick iterations, but always test on the full emulator before deploying to a real device.

## Remote Debugging

Once the app is running on the emulator or device:

1. **Enable debugging in config.xml** (already enabled by default)

2. **Connect Chrome DevTools:**
   - Open Chrome browser
   - Navigate to `chrome://inspect`
   - Click "Configure" → Add `localhost:9222`
   - Your Tizen app should appear under "Remote Target"

3. **Inspect and Debug:**
   - Click "inspect" under your app
   - Use Chrome DevTools as normal (Console, Network, Elements, etc.)

## Tips

- **Faster iteration:** Use `yarn dev:web` for development in a regular browser, then test on emulator periodically
- **Hot reload:** Not available on Tizen, you need to rebuild and reinstall
- **Remote control testing:** The emulator has a virtual remote - use it to test navigation
- **Performance:** The emulator may be slower than real hardware, test on real device for final validation

## Next Steps

After successful emulator testing:
1. Test on a real Samsung TV (see main README)
2. Submit to Samsung Seller Office for distribution
3. Follow Samsung's app certification guidelines

## Useful Commands Reference

```bash
# List all emulators
emulator-manager list

# Launch emulator
emulator-manager launch --name MyTVEmulator

# Check connected devices
sdb devices

# Install app
tizen install -n MultiTVExpoApp.wgt -t <target>

# Run app
tizen run -p MultiTVExpoApp -t <target>

# Uninstall app
tizen uninstall -p MultiTVExpoApp -t <target>

# View logs
sdb dlog

# Stop emulator
emulator-manager stop --name MyTVEmulator
```
