Download all the necessary files then make sure to replace a few things:
1) edit the ".env.example" file and name it to ".env" then add your MongoDB Atlas connection string. Note you only need the default connection string the one that generates until the name of the cluster as the Database name and Collection name have been defined seperately in the file "api/save-hash.js"
2) In your ".env" file itself create a password token (you will need to replace the same thing in the App.tsx file as well)
3) In the file "api/save-hash.js" make sure to change the name of the "database" and "collection" to whatever you want it to be.
4) In the file "App.tsx" replace "YOUR_IP" with your actual local IP Address (keep the port number same if not occupied, if changed make sure to also change the port number in api/save-hash.js).
5) In the file "App.tsx" change the "your-secret-token-here" with the text inside APP_SECRET_TOKEN in your ".env" file. This password string is required twice in "App.tsx"
