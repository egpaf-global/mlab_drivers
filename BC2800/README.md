# BC2800
Machine driver for mindray bc2800 - Bc3000

1. Install node v10.24.1 on all in one pc
 ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
  source ~/.bashrc
  nvm install 10.24.1
  nvm use 10.24.1
```
2. Navigate into BC2800 folder
3. Install dependencies
```
  npm install
```
3. Connect the serial machine and all in one using the serial cable provided. The cable to the all in one should connected on the port found on the side of the all in one
4. Run the driver( cd BC2800)
```
  node kx21n.js
```
NB: This should show a log: "Port open", if the connection is succesful. Should opening port require permissions, give the port permission by running: ``` sudo chmod -R 777 /dev/ttyUSB0 ``` 
  
5. Go to settings about transimission in the lab machine - then enable Auto Trans.  
6. Do a dummy test on the machine and observe the log on the all in one terminal whenever the machine finishes processing the test. 
