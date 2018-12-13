//tää on se mikä käynnistetään cmdstä nodella
//variablet
let express = require('express');
let path = require('path');
let app = express();
let http = require('http').createServer(app); //lisäsin tähän .Server tilalle .createServer herokua varten ota pois jos ei toimi 
let io = require('socket.io')(http);
let mongoose = require('mongoose');

var line_history = []; //array johon tulee piirretyt jutut

let users = {}; //käyttäjälista
let connections = [];
let PORT = process.env.PORT || 3000;


mongoose.connect('mongodb://mikamattichat:heroku1@ds113003.mlab.com:13003/chat', { useNewUrlParser: true }, function(err)
{
    if(err)
    {
        console.log(err);
    }
    else
    {
        console.log('connected to mongoDB');
    }
});
//määritellään storage
let chatSchema = mongoose.Schema(
    {
        user: String,
        msg: String,
        timestamp: {type: Date, default: Date.now}
    });

let Chat = mongoose.model('Message', chatSchema);


//tässä lähetetään localhostiin haluttu sivu kuten index.html
app.get('/', function(req, res)
{    
    res.sendFile(__dirname + '/index.html');
});

//static files josta haetaan css
app.use('/static', express.static('static'));

app.use(express.static('public'));

//localhost portinkuuntelu vaihdettu 3000 = PORT variable ja määritellään se tuol ylempänä sitten
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

    socket.username = "newUser" + Math.random().toString(36).substr(2, 5); // tehdään default nimestä uniikki
    users[socket.username] = socket;
    updateUsernames();
    updateConnections();

    //tuo vanhat viestit mongodb databasesta
    let query = Chat.find({});  //pelkät {} löytää aivan kaiken.
        query.sort('-timestamp').limit(30).exec(function(err, docs) //tuodaan 20 viimeistä viestiä -timestamp on descending, muuten se olisi ascending
    {
        if(err) 
        {
            throw err;
        }
        else
        {
            socket.emit('load old msgs', docs);
            console.log('Lähetetään vanhat viestit ikkunaan');
        }
    });
    //piirroksen refreshaus uusillekkin käyttäjille
    updateCanvas();

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
    
    //piirtämisten lisääminen ja lähettäminen kaikille.
    socket.on('draw_line', function (data) 
    {
        line_history.push(data.line);
        io.emit('draw_line', { line: data.line }); //lähetä piirto kaikkiin clientteihin
        updateLines();
        //console.log("piirto lisätty");
    });

    //pyyhin
    // socket.on('erasertool', function (data)
    // {
    //     io.emit('erasertool');
    //     //line_history.splice(line_history.indexOf(data.line), 1);
    // });
    //tyhjennä canvas
    socket.on('clearit', function()
    {
        line_history = [];
        io.emit('clearit', true);
        updateLines();
    });

    //jos ikkunan kokoa muutetaan clientside
    socket.on('resize', function(data)
    {        
        for (var i in line_history) 
        {
            socket.emit('draw_line', { line: line_history[i] } );
            updateLines();
        }
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
                    users[name].emit('whisper', {msg: msg, user: socket.username}); //lähetetään yksityisviesti
                    socket.emit('whisper', {msg: msg, user: socket.username});      // lähettää viestin myös itselle ikkunaan eli current socket
                    console.log('whisper', {user: socket.username, msg: msg, name:name});        
                }
                else
                {
                    callback('Incorrect username.');
                }
                
            }
            else
            {
                callback('You cannot send an empty whisper.');
            }
            
        }
        else //ilman komentoa lähetetään tavallinen viesti kaikille
        {   
            let newMsg = new Chat({msg: msg, user: socket.username}); // luodaan databaseen viesti
            newMsg.save(function(err)
            {         
                if(err) 
                {
                    throw err;
                }
                else
                {
                    io.emit('new message', {msg: msg, user: socket.username});
                    console.log('message:', {user: socket.username, msg: data});
                }
            });
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
        data = data.replace(/\s/g, ''); //poistetaan välilyönnit nimimerkistä        
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
                data = data.replace(/\s/g, ''); //poistetaan välilyönnit nimimerkistä   
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

    function updateLines()
    {
        io.sockets.emit('get lines', (( line_history.length * 2 * 4) / 1024)); //tässä on ensin muutettu viivan koko byteksi, sitten kilobyteksi
    }

    function updateCanvas()
    {
        for (var i in line_history) 
        {
            socket.emit('draw_line', { line: line_history[i] } );
            updateLines();
        }

    }
});



