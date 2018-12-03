//tää on se mikä käynnistetään cmdstä nodella
//variablet
let express = require('express');
let path = require('path');
let app = express();
let http = require('http').createServer(app); //lisäsin tähän .Server tilalle .createServer herokua varten ota pois jos ei toimi 
let io = require('socket.io')(http);

let users = []; //käyttäjälista
let connections = [];
let PORT = process.env.PORT || 3000;
//let inout;

//tässä lähetetään localhostiin haluttu sivu kuten index.html
app.get('/', function(req, res)
{    
    res.sendFile(__dirname + '/index.html');
});

//static files josta haetaan css
app.use('/static', express.static('static'));

app.use(express.static('public'));

//localhost portinkuuntelu vaihdettu 3000 = PORT variable ja definoidaan se tuol ylempänä sitten
http.listen(PORT, function()
{
    console.log('listening on *:' + PORT);

});

//kuunnellaan incoming sockets ja ilmoitetaan asiasta consolissa.
//ilmoitetaan myös kun käyttäjä disconnectaa
io.on('connection', function(socket)
{
    //on connection
    connections.push(socket);
    console.log('user connected');
    console.log('Connected: %s sockets connected', connections.length);

    //disconnect
    socket.on('disconnect', function()
    {
    hasLeft();
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();    

    connections.splice(connections.indexOf(socket), 1);
    updateConnections();

    console.log('user disconnected');
    console.log('Disconnected: %s sockets connected', connections.length);
    
    });

    //broadcastataan kopattu viesti takaisin kaikille serveriltä
    socket.on('chat message', function(data)
    {
        io.emit('chat message', {msg: data, user: socket.username});
        //toimii console.log('viesti lähetetty takaisin clientsideen');
        console.log('message:', {user: socket.username, msg: data});
    });

    //nimimerkin asetus toimii nyt
    socket.on('new user', function(data, callback)
    {
        if(users.indexOf(data) != -1) //jos nimi löytyy jo arraysta
        {
             callback(false);
             console.log ("nimi -" + data + "- on jo käytössä");
             console.log ("lista nimistä: " + users);
        }
        else
        {
            
        
        callback(true);
        socket.username = data;
        users.push(socket.username);
        hasJoined();
        updateUsernames();
        updateUsername();
        updateConnections();

        console.log ("username is " + data);
        console.log ("lista nimistä: " + users);
        }

    });
    //nimenvaihto
    socket.on('change user', function(newdata, callback)
        {
            if(users.indexOf(newdata) != -1) //jos nimi löytyy jo arraysta
            {
                callback(false);
                console.log ("nimi -" + newdata + "- on jo käytössä");
                console.log ("lista nimistä: " + users);
            }
            else
            {
                callback(true);
                nameChangestart();
                users.splice(users.indexOf(socket.username), 1); // tän pitäisi poistaa vanha
                socket.username = newdata;
                users.push(socket.username);
                updateUsernames();
                updateUsername();
                nameChangeend();
                //updateConnections();

                console.log("new username is " + newdata);
                console.log("lista nimistä: " + users);
            }
        });

    function updateUsernames()
    {
        io.sockets.emit('get users', users); //io.sockets.emit broadcastaa KAIKILLE
    }

    function updateUsername()
    {
        //io.sockets.emit('get user', socket.username);
        socket.emit('get user', {user: socket.username}); //on tärkeää muistaa, että tämä broadcastaa vain itselle EI KAIKILLE
    }

    function updateConnections()
    {
        io.sockets.emit('get connections', users.length)
    }

    function hasJoined()
    {
        io.sockets.emit('joined server', {user: socket.username});  
    }

    function hasLeft()
    {
        io.sockets.emit('left server', {user: socket.username});  
    }

    function nameChangestart()
    {
        io.sockets.emit('changed namestart', {user: socket.username});
    }
    function nameChangeend()
    {
        io.sockets.emit('changed nameend', {user: socket.username});
    }

});



