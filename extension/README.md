# UTC Student Chat Assistant - Chrome Extension

A Chrome extension that provides an AI-powered chat assistant for the UTC Student Information System.

## Features

- **Popup Chat Interface**: Click the extension icon to open a chat window
- **Page Chat Widget**: Floating chat button on any webpage
- **API Integration**: Connects to your local API at `http://127.0.0.1:5000/ask`
- **Chat History**: Saves conversation history locally
- **Responsive Design**: Works on desktop and mobile
- **Vietnamese Support**: Full Vietnamese language support

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download the extension files** to a folder on your computer
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the folder containing the extension files
5. **Pin the extension** to your toolbar for easy access

### Method 2: Create Extension Package

1. **Zip all files** in the extension folder
2. **Rename the zip file** to `.crx` (optional)
3. **Install via Chrome Extensions page**

## Files Structure

```
extension-folder/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── content.js            # Page injection script
├── content.css           # Page styling
├── icon16.png            # 16x16 icon
├── icon48.png            # 48x48 icon
├── icon128.png           # 128x128 icon
└── README.md             # This file
```

## Usage

### Popup Mode
1. Click the extension icon in the toolbar
2. Type your question in the chat input
3. Press Enter or click the send button
4. Get AI responses about UTC student services

### Page Mode
1. Click the expand button in the popup to switch to page mode
2. A floating chat button will appear on the current webpage
3. Click the chat button to open the chat window
4. Use the chat normally on any webpage

## API Configuration

The extension calls your API at `http://127.0.0.1:5000/ask` with the following format:

**Request:**
```json
{
  "query": "user question"
}
```

**Expected Response:**
```json
{
  "answer": "AI response text"
}
```

## Permissions

- `activeTab`: Access to current tab for page mode
- `storage`: Save chat history locally
- `host_permissions`: Access to localhost API and UTC website

## Customization

### Change API URL
Edit the `apiUrl` variable in both `popup.js` and `content.js`:
```javascript
this.apiUrl = 'http://your-api-url:port/endpoint';
```

### Modify Styling
Edit `popup.css` and `content.css` to change colors, fonts, and layout.

### Add Features
- Modify `popup.js` for popup functionality
- Modify `content.js` for page widget functionality

## Troubleshooting

### Extension Not Working
1. Check if the API server is running at `http://127.0.0.1:5000`
2. Verify the API endpoint `/ask` is accessible
3. Check browser console for errors
4. Ensure extension has proper permissions

### API Connection Issues
1. Verify the API URL in the code matches your server
2. Check CORS settings on your API server
3. Ensure the API accepts POST requests with JSON body

### Chat Not Appearing on Pages
1. Refresh the webpage after installing the extension
2. Check if the content script is loaded (Developer Tools → Console)
3. Verify the extension has permission for the current domain

## Development

### Testing Changes
1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh button on your extension
4. Test the changes

### Debugging
1. Open Developer Tools (F12)
2. Check Console for JavaScript errors
3. Use Network tab to monitor API calls
4. Check Extension popup for popup-specific issues

## Support

For issues or questions:
- Check the browser console for error messages
- Verify API server is running and accessible
- Ensure all extension files are present and properly configured

## License

This extension is created for UTC Student Information System use.
