//tää on se mikä käynnistetään cmdstä nodella
//variablet
let express = require('express');
let path = require('path');
let app = express();
let http = require('http').createServer(app); //lisäsin tähän .Server tilalle .createServer herokua varten ota pois jos ei toimi 
let io = require('socket.io')(http);

//let sanitize = require('validator').sanitize; //putsataan input mahdollisista koodi injectioneista.

let users = {}; //käyttäjälista
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
    //koitetaan kellonaikaa tehdä timestamppeihin socket.emit('datetime', { datetime: new Date().getTime() });
    

    connections.push(socket);
    console.log('user connected');
    console.log('Connected: %s sockets connected', connections.length);

    socket.username = "newUser" + Math.random().toString(36).substr(2, 5);
    users[socket.username] = socket;
    updateUsernames();
    updateConnections();
    


    //disconnect
    socket.on('disconnect', function()
    {
    hasLeft();
    delete users[socket.username];
    updateUsernames();    

    connections.splice(connections.indexOf(socket), 1);
    updateConnections();

    console.log('user disconnected');
    console.log('Disconnected: %s sockets connected', connections.length);
    
    });

    //viestin lähettäminen ikkunaan
    socket.on('chat message', function(data, callback)
    {
        var msg = data.trim();
        if(msg.substr(0,3) === '/w ') //tällä komennolla voi lähettää yksityisviestin
        {
            msg = msg.substr(3); //poistetaan viestistä /w
            var ind = msg.indexOf(' ');
            if(ind !== -1)
            {
                var name = msg.substring(0, ind);
                var msg = msg.substring(ind + 1);
                if(name in users)
                {
                    users[name].emit('whisper', {msg: msg, user: socket.username}); //lähetetään yksityisviesti mutta users[name ei löydä oikeaa usernamee] muuten toimii
                    socket.emit('whisper', {msg: msg, user: socket.username});      // lähettää viestin myös itselle ikkunaan eli current socket
                    console.log('whisper', {user: socket.username, msg: msg, name:name});          //siis index puolellakin toimii mutta users[name] ei toimi
                }
                else
                {
                    callback('That user is not in the room.');
                }
                
            }
            else
            {
                callback('You cannot send an empty whisper.');
            }
            
        }
        else //ilman komentoa lähetetään tavallinen viesti kaikille
        {            
            io.emit('new message', {msg: msg, user: socket.username});
            console.log('message:', {user: socket.username, msg: data});
        }
    });

    //nimimerkin asetus toimii nyt
    socket.on('new user', function(data, callback)
    {
        if(data in users) //jos nimi löytyy jo 
        {
             callback(false);
             console.log ("nimi -" + data + "- on jo käytössä");
             console.log("Lista nimistä: " + Object.keys(users));
        }
        else
        {
            
        
        callback(true);
        delete users[socket.username];
        socket.username = data;
        users[socket.username] = socket;
        hasJoined();
        updateUsernames();
        updateUsername();
        updateConnections();

        console.log ("username set to " + data);
        console.log("Lista nimistä: " + Object.keys(users));
        }

    });
    //nimenvaihto
    socket.on('change user', function(data, callback)
        {
            if(data in users) //jos nimi löytyy jo arraysta
            {
                callback(false);
                console.log ("nimi -" + data + "- on jo käytössä");
                console.log("Lista nimistä: " + Object.keys(users));
            }
            else
            {
                callback(true);                
                nameChangestart();
                delete users[socket.username]; // tän pitäisi poistaa vanha
                socket.username = data;
                users[socket.username] = socket;
                updateUsernames();
                updateUsername();                
                nameChangeend();
                console.log("username changed to " + data);
                console.log("Lista nimistä: " + Object.keys(users));
            }
        });


    function updateUsernames()
    {
        io.sockets.emit('get users', Object.keys(users)); //io.sockets.emit broadcastaa KAIKILLE
    }

    function updateUsername()
    {
        //io.sockets.emit('get user', socket.username);
        socket.emit('get user', {user: socket.username}); //on tärkeää muistaa, että tämä broadcastaa vain itselle EI KAIKILLE
    }

    function updateConnections()
    {
        io.sockets.emit('get connections', connections.length)
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



