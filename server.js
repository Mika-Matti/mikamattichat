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

//timestamp variableja
let date = new Date();
let year = date.getFullYear();
let month = date.getMonth();
let day = date.getDate();
let hours = date.getHours();
let minutes = date.getMinutes();


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
        msg: String,    //alla oleva timestamp ottaa tunnit ja minuutit. Timestampissa myös korjataan, jos mikään luku on < 10 niin lisätään 0 eteen.
        timestamp: {type: String, default: (hours<10?'0':'') + hours + ":" +(minutes<10?'0':'') + minutes},
        oldmessagetime: {type: String, default: (day<10?'0':'') + day + "/" + ((month+1)<10?'0':'') + (month+1) + "/" + year},
        fulltime: {type: Date, default: Date.now} //määritellään tän perusteella uusin viesti kun haetaan viestejä databasesta
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

    //tuo vanhat viestit mongodb databasesta
    let query = Chat.find({});  //pelkät {} löytää aivan kaiken.
    query.sort('-fulltime').limit(30).exec(function(err, docs) //tuodaan 20 viimeistä viestiä -timestamp on descending, muuten se olisi ascending
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

    socket.username = "newUser" + Math.random().toString(36).substr(2, 5); // tehdään default nimestä uniikki
    users[socket.username] = socket;
    updateUsernames();
    updateConnections();
 
    //ilmoitetaan että on liittynyt serverille
    hasJoined();

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
        //console.log("data sisällä: " + Object.keys(data.line[0]));        
        updateLines();
    });


    //pyyhin
    socket.on('erasertool', function (data)
    {        
        for (let i = 0; i < line_history.length; i++) //tämä on toimiva. pyyhin tekeee viivan ja jos viiva osuu piirrettyyn lineen, se poistetaan
         {
		  	if ( LineToLineIntersection ( data.mouse.x, data.mouse.y, data.mouse2.x, data.mouse2.y, line_history [i][0].x, line_history [i][0].y, line_history [i][1].x, line_history [i][1].y ) )
		  	{
                  //console.log("onnistu");
                  line_history.splice ( i, 1 );
                  updateLines();
                  updateCanvas();
		  		break;
		 	}           
        }    
        
    });
    //tyhjennä canvas
    socket.on('clearit', function()
    {
        line_history = [];
        io.emit('clearit', true);
        updateLines();
    });

    //jos ikkunan kokoa muutetaan clientside
    socket.on('resize', function()
    {        
        for (var i in line_history) 
        {
            socket.emit('draw_line', { line: line_history[i] } );
        }
        updateLines();
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
            
            
            let newMsg = new Chat({msg: msg, user: socket.username, timestamp: (hours<10?'0':'')+ hours + ":" + (minutes<10?'0':'') + minutes}); // luodaan databaseen viesti
            newMsg.save(function(err)
            {         
                if(err) 
                {
                    throw err;
                }
                else
                {
                    io.emit('new message', {msg: msg, user: socket.username, timestamp: (hours<10?'0':'')+ hours +":" +(minutes<10?'0':'') + minutes});
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
        let currentname = socket.username;     
        data = data.replace(/\s/g, ''); //poistetaan välilyönnit nimimerkistä        
        delete users[socket.username];
        socket.username = data;
        users[socket.username] = socket;
        
        updateUsernames();
        updateUsername();
        nameChangestart(currentname);
        
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
                let currentname = socket.username;             
                data = data.replace(/\s/g, ''); //poistetaan välilyönnit nimimerkistä   
                delete users[socket.username]; // tän pitäisi poistaa vanha
                socket.username = data;
                users[socket.username] = socket;
                updateUsernames();
                updateUsername();                
                nameChangestart(currentname);
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
        socket.broadcast.emit('joined server', {user: socket.username});  
    }

    function hasLeft()
    {
        io.sockets.emit('left server', {user: socket.username});  
    }

    function nameChangestart(currentname)
    {
        
        io.sockets.emit('changed namestart', {currentname: currentname, user: socket.username});
    }

    function updateLines()
    {
        io.sockets.emit('get lines', (( line_history.length * 2 * 4) / 1024)); //tässä on ensin muutettu viivan koko byteksi, sitten kilobyteksi
    }

    function updateCanvas()
    {
        io.emit('clearit', true);
        for (var i in line_history) 
        {
            io.emit('draw_line', { line: line_history[i] } );
            
        }
        updateLines();
    }
    //Pyyhkimeen funktioita jotta hiiri osaisi huomata viivan
    function Vec2Cross2 ( x1, y1, x2, y2 )
	{
		return ( x1 * y2 ) - ( y1 * x2 );
	}

	function LineToLineIntersection ( x11, y11, x12, y12, x21, y21, x22, y22 )
	{
        //line directional vector
		var d2x = x22 - x21;
		var d2y = y22 - y21;
		// mouse directional vector
		var d1x = x12 - x11;
		var d1y = y12 - y11;
		//mouse directional vector
		var d21x = x21 - x11;
		var d21y = y21 - y11;
		//mouse starting point directional vector to line starting point
		var cV = Vec2Cross2 ( d1x, d1y, d2x, d2y );
		var cV2 = Vec2Cross2 ( d21x, d21y, d2x, d2y );
		var s = ( cV2 * cV ) / ( cV * cV );
		
		if ( s > 0.0 && s <= 1.0 )
        {
            var intersectionX = x11 + d1x * s;
            var intersectionY = y11 + d1y * s;
            var sqr = Math.sqrt ( d2x * d2x + d2y * d2y );
            var intersectionDirectionX = intersectionX - x21;
            var intersectionDirectionY = intersectionY - y21;
            var d = ( d2x / sqr ) * intersectionDirectionX + ( d2y / sqr ) * intersectionDirectionY;
            var length1 = Math.sqrt ( d2x * d2x + d2y * d2y );
            var length2 = Math.sqrt ( ( intersectionX - x21 ) * ( intersectionX - x21 ) + ( intersectionY - y21 ) * ( intersectionY - y21 ) );

            if ( length1 < length2 || d < 0.0 )
                return false;
            else
                return true;
        }
		
		return false;
	}



});



