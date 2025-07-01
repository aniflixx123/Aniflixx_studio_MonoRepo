// Workaround for Response constructor issue
if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = init.headers || {};
      this.ok = this.status >= 200 && this.status < 300;
    }
    
    async json() {
      return JSON.parse(this.body);
    }
    
    async text() {
      return this.body;
    }
  };
}
/**
* @format
*/
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

enableScreens();
import {AppRegistry} from 'react-native';
import '@react-native-firebase/app'; // Just import the module, no need to call initializeApp
import App from './App';
import {name as appName} from './app.json';

// React Native Firebase auto-initializes when GoogleService-Info.plist is present
console.log("🔥 Firebase module imported - auto-initialization triggered");

AppRegistry.registerComponent(appName, () => App);