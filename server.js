//tää on se mikä käynnistetään cmdstä nodella
//variablet
let express = require('express');
let path = require('path');
let app = express();
let http = require('http').createServer(app); //.Server tilalle .createServer herokua varten 
let io = require('socket.io')(http);
let mongoose = require('mongoose');

var lineHistory = []; //array johon tulee piirretyt jutut
var bufferArray = []; //väliaikanen array joka kerää pienen määrän lähetettyjä piirtokomentoja ja lähettää ne kerralla sitten.

let users = {}; //Näkyväkäyttäjälista
let admins = {}; //nimet joilla on adminoikeudet
let fakeUsers = {}; //lowercase username lista
let connections = [];
let PORT = process.env.PORT || 3000;

//timestamp variableja
//time = new Date();
//let date = new Date(Date.now() - time.getTimezoneOffset()*60000)
let date = new Date();
let year = date.getFullYear();
let month = date.getMonth();
let day = date.getDate();
let hours = date.getHours();
let minutes = date.getMinutes();
let timeHoursMins = ((hours<10?'0':'')+ hours +":" +(minutes<10?'0':'') + minutes);
let timeDayMonthYear = ((day<10?'0':'') + day + "/" + ((month+1)<10?'0':'') + (month+1) + "/" + year);

let adminCrown = "🎩"; //"👑" "🎩"

var regexi = /[^a-zA-Z0-9äöå_.-]+/g; //sallitut username merkit

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
        timestamp: {type: String, default: timeHoursMins},
        oldmessagetime: {type: String, default: timeDayMonthYear},
        fulltime: {type: Date, default: Date.now}, //määritellään tän perusteella uusin viesti kun haetaan viestejä databasesta
        style: String//nämä sisältävät viestin muotoilua
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
    //let query = Chat.find({});  //pelkät {} löytää aivan kaiken collectionista.
    let query = Chat.find().sort('-fulltime').limit(30); //tässä kokeillaan löytyiskö nopeammin kaikki, ettei etitä kaikkea.
    query.exec(function(err, docs) //tuodaan 20 viimeistä viestiä -timestamp on descending, muuten se olisi ascending
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
    var generateName = "newuser" + Math.random().toString(36).substr(2,5);
    socket.username = generateName //"newUser" + Math.random().toString(36).substr(2, 5); // tehdään default nimestä uniikki
    users[socket.username] = socket;
        
        //console.log('fake users: ' + fakeUsers[];
    socket.userfake = generateName;
    fakeUsers[socket.userfake] = socket;
    //fakeUsers.push(socket.userfake);
    console.log('users: ' + Object.keys(users));
    console.log('fakeusers: ' + Object.keys(fakeUsers));
    updateUsernames();
    updateUsername();    
    updateConnections();
 
    //ilmoitetaan että on liittynyt serverille
    hasJoined();

    //piirroksen refreshaus uudelle käyttäjälle
    updateCanvas();

    //disconnect
    socket.on('disconnect', function()
    {
        var name = socket.username;              
        if (name in admins)
        {
            delete admins[socket.useradminname];            
        }
        hasLeft();
        delete users[socket.username];        
        updateUsernames();    
        delete fakeUsers[socket.userfake];      

        connections.splice(connections.indexOf(socket), 1);
        updateConnections();

        console.log('user disconnected');
        console.log('Disconnected: %s sockets connected', connections.length);  
        console.log('fake users: ' + Object.keys(fakeUsers));
        console.log('users: ' + Object.keys(users));  
        console.log("admins: " + Object.keys(admins));
    });

    socket.on('draw', function(data)
    {
        //bufferArray.push({ line: data.line, user: socket.username}); // tätä lähetetään 25ms välein ja sitten tyhjennetään. Alkuperäinen
        if(data.isDrawing)
        {                    
            for (let i = 0; i < data.line.length; i++)
            {      
                bufferArray.push({line: data.line[i].line, user: socket.username});              
            }
        }
        else
        {
            lineHistory.push(data.line); 
            updateLines();
        }
    });

    //pyyhin
    socket.on('erasertool', function (data)
    {        
        for (let i = 0; i < lineHistory.length; i++) //tämä on toimiva. pyyhin tekee viivan ja jos viiva osuu piirrettyyn lineen, se poistetaan
        {
            var foundLine = false;
            for (let a = 0; a < lineHistory[i].length; a++)
            {
                var line = lineHistory[i][a].line;
		  	    if ( LineToLineIntersection ( data.mouse.x, data.mouse.y, data.mouse2.x, data.mouse2.y, line[0].x, line[0].y, line[1].x, line[1].y ) )
                {
                    //console.log("Kumitus onnistui " + lineHistory.length);
                    lineHistory.splice ( i, 1 );
                    foundLine = true;
                    
                    updateCanvasAll(); //päivitetään canvas kaikille
                    //io.emit('new eraser', { data: data });
                    
                    //io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                    break;
                }   
            }   
            if (foundLine) 
            {
                //console.log("foundline break");
                break;
            }    
        }            
    });
    //tyhjennä canvas
    socket.on('clearit', function()
    {
        lineHistory = [];
        io.emit('clearit', true);
        updateLines();
    });
    //jos ikkunan kokoa muutetaan clientside
    socket.on('resize', function()
    {        
        updateCanvas();       
    });    
    //viestin lähettäminen ikkunaan
    socket.on('chat message', function(data, callback)
    {
        msg = data.trim();
        //Tässä muutetaan < ja > merkit niiden text counterparteiksi. Tarvittaessa voi lisätä enemmän merkkejä, jos vaikuttaa siltä, että tarvii.
        var space = (" ");
        var https = ("https://");
        var www = ("www.");
        var chars = {'<':'&#60;','>':'&#62;','\n':'<br>'};
        msg = data.replace(/[<>\n]/g, m => chars[m]);      
        if(msg.match(https) && !msg.match(www) )
        {
            console.log("matched");
            var link = (https, ("<a target='_blank' href='" + msg.substring(https +1) + "'>" + msg.substring(https +1) + "</a>") );
            //msg = msg.substr(msg);
            msg = link;
        }
        else if(msg.match(www) && !msg.match(https) )
        {               
            console.log("matched");
            var link = (www, ("<a target='_blank' href='https://" + msg.substring(www +1) + "'>" + msg.substring(www +1) + "</a>") );
            console.log(link);
            //msg = msg.substr(msg);
            msg = link;
        }
        else if( msg.match(https) && msg.match(www) )
        {
            console.log("molemmat matched");
            var link = (www, ("<a target='_blank' href='"+ msg.substring(www +1) + "'>" + msg.substring(https +1) + "</a>") );
            msg = link;
        }
           
        if(msg.substr(0,7).toLowerCase() === '/admin ') //admin login
        {
            msg = msg.substr(7);
            
            var password = msg.substring(0, ind);              
            var pass = "Kettunen1234";
            if(password === pass)
            {                                  
                delete users[socket.username]; // poistetaan vanha nimi                 
                socket.username = adminCrown + socket.username; //uusi admin nimi tilalle
                users[socket.username] = socket;   //lisätään listaan vaihdettu nimi

                socket.useradminname = socket.username;  //uusi admin nimi
                admins[socket.useradminname] = socket;  //uusi admin nimi admin arrayhyn
                //users[socket.username] = socket; 

                updateUsernames();
                isNowAdmin();
                console.log({admin: socket.useradminname}, " on nyt admin.");
                console.log("Admins: " + Object.keys(admins));
                console.log("Users: " + Object.keys(users));
                
            }
            else
            {
                //callback('Wrong password');
                console.log("Incorrect admin login ", {user: socket.username, msg: msg});   
            }           
            
        }
        else if(msg.substr(0,9).toLowerCase() === '/setadmin') //tee haluamastasi käyttäjästä admin
        {
            msg = msg.substr(9); //poistetaan viestistä /setadmin            
            var name = socket.username;              
            if (name in admins)
            {
                var ind = msg.indexOf(' ');
                name = msg.substring(ind +1);
                //if (name.toLowerCase() in fakeUsers)
                if (name in users) //Tässä on pakko olla case sensitive ehkä, jotta annettu nimi ei vaihtuisi lowercaseksi näkyvässä listassa.
                {                                  
                    var oldName = name;
                    var newName = adminCrown + name;
                    //vaihdetaan valitun käyttäjän nimi näkyvään listaan
                    users[newName] = users[oldName];
                    users[newName].username = newName; //tämä tekee adminiksi toimii.
                    delete users[oldName]; //poistetaan vanha nimi. Toimii                         

                    users[newName].useradminname = users[newName]; //Määritetään adminlistaan nimi
                    admins[newName] = users[newName]; //Lisätään listaan

                    updateUsernames();                    
                    console.log(name + " on nyt admin.");
                    console.log("Admins: " + Object.keys(admins));
                    console.log("Users: " + Object.keys(users));    

                    //lähetetään viesti asiasta chattiin sekä tallennetaan viesti databaseen.
                    style = " <i><b>";
                    msg = "</b> made <b>" + newName + "</b> admin.";
                    let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                    newMsg.save(function(err)
                    {
                        if(err)
                        {
                            throw err;
                        }
                        else
                        {
                            updateDate();
                            io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                        }
                    });
                }
                else
                {
                    callback('Incorrect username.');
                }                
            }
            else
            {
                callback("You don't have the rights to do that.");
            }            
        }   
        else if(msg.substr(0,12).toLowerCase() === '/removeadmin') //tee haluamastasi käyttäjästä admin
        {
            msg = msg.substr(12); //poistetaan viestistä /removeadmin            
            var name = socket.username;              
            if (name in admins)
            {
                var ind = msg.indexOf(' ');
                name = msg.substring(ind +1);
                var name2 = adminCrown + name; //lisätään haettavaan nimeen adminkruunu
                if (name2 in users) //case sensitive nimihaku
                {
                    //vaihdetaan nimi users arrayhyn         
                    users[name] = users[name2]; 
                    users[name].username = name;  
                    delete users[name2]; //poistetaan vanha nimi. Toimii.
                    //ja poistetaan admineista
                    delete admins[name2];

                    updateUsernames();     
                    console.log(name + " ei ole enää admin.");
                    console.log("Admins: " + Object.keys(admins));
                    console.log("Users: " + Object.keys(users));  

                    //lähetetään viesti asiasta chattiin sekä tallennetaan viesti databaseen.                     
                    style = " <i><b>";
                    msg = "</b> made <b>" + name + "</b> user.";
                    let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                    newMsg.save(function(err)
                    {
                        if(err)
                        {
                            throw err;
                        }
                        else
                        {
                            updateDate();
                            io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                        }
                    });                        
                }
                else
                {
                    callback('Incorrect username.' + msg);
                }
            }
            else
            {
                callback("You don't have the rights to do that.");
            }
        }        
        else if(msg.substr(0,8).toLowerCase() === '/rename ') //tee haluamastasi käyttäjästä admin
        {
            msg = msg.substr(8); //poistetaan viestistä /setadmin            
            var name = socket.username;              
            if (name in admins)
            {
                var ind = msg.indexOf(' ');
                var name = msg.substring(0, ind);
                var newName = msg.substring(ind + 1);
                var adminName = adminCrown + name;
                var regex = regexi;
                if (adminName in admins)
                {
                    callback("You can't rename an admin");
                }       
                else if(newName.toLowerCase() in fakeUsers || newName.match(regex) || newName.length > 13 || newName.length < 1)
                {
                    callback("That nickname is invalid or already taken!");
                    console.log ("nimi " + newName + " on jo käytössä");
                    console.log("Lista nimistä: " + Object.keys(users));
                }    
                else if (name in users) //taas pakko olla casesensitive
                {                               
                    //vaihdetaan valitun käyttäjän nimi näkyvään listaan
                    users[newName] = users[name];
                    users[newName].username = newName; 
                    delete users[name];          
                    
                    lowercaseName = name.toLowerCase();
                    lowerCasenewName = newName.toLowerCase();
                    //vaihdetaan nimi myös lowercase listaan
                    fakeUsers[lowerCasenewName] = users[newName];
                    fakeUsers[lowerCasenewName].userfake = lowerCasenewName;
                    delete fakeUsers[lowercaseName];

                    updateUsernames();
                    users[newName].emit('get user', {user: newName}); //on tärkeää muistaa, että tämä broadcastaa vain itselle EI KAIKILLE           
                    console.log(name + " on nyt " + newName);
                    console.log("Users: " + Object.keys(users));
                    console.log("fakeUsers: " + Object.keys(fakeUsers));    

                    //lähetetään viesti asiasta chattiin sekä tallennetaan viesti databaseen.
                    style = " <i><b>";
                    msg = "</b> renamed <b>" + name + "</b> to <b>" + newName + "</b>";
                    let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                    newMsg.save(function(err)
                    {
                        if(err)
                        {
                            throw err;
                        }
                        else
                        {
                            updateDate();
                            io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                        }
                    });
                }
                else
                {
                    callback('Incorrect username "' + name + '"or new name "' + newName + '"');
                }                
            }
            else
            {
                callback("You don't have the rights to do that.");
            }            
        }   
        else if(msg.substr(0,9).toLowerCase() === '/imitate ') //lähetä viesti jonkun toisen nimellä(restrict admin)
        {
            msg = msg.substr(9); //poistetaan '/imitate'
            var name = socket.username;              
            if (name in admins)
            {
                var ind = msg.indexOf(' ');
                if(ind !== -1)
                {
                    style = " <b>";
                    name = msg.substring(0, ind);
                    msg = ": </b>" + msg.substring(ind +1);
                    
                    
                    let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: name, msg: msg}); // luodaan databaseen viesti
                    newMsg.save(function(err)
                    {         
                        if(err) 
                        {
                            throw err;
                        }
                        else
                        {                            
                            updateDate();
                            io.emit('new message', {timestamp: timeHoursMins, style: style, user: name, msg: msg});
                        }
                    });
                }
            }
            else
            {
                callback("You don't have the rights to do that.");
            }
        }
        else if(msg.substr(0,6).toLowerCase() === '/alert') //lähetä viesti alert muodossa
        {
            msg = msg.substr(6); //poistetaan '/imitate'
            var name = socket.username;              
            if (name in admins)
            {
                var ind = msg.indexOf(' ');
                if(ind !== -1)
                {
                    style = " <b>";
                    name = socket.username;
                    msg = "</b> sent an alert. <script>alert('" + msg.substring(ind +1)+"');</script>";  
                   
                    updateDate();
                    io.emit('new message', {timestamp: timeHoursMins, style: style, user: name, msg: msg});                
                }
            }
            else
            {
                callback("You don't have the rights to do that.");
            }
        }            
        else if(msg.substr(0,6).toLowerCase() === '/purge') //tyhjennetään viestihistoria kokonaan databasesta ja clientistä (restrict admin)
        {
            msg = msg.substr(6); //poistetaan /purge viestistä
            
            var name = socket.username;              
            if (name in admins)
            {
                Chat.deleteMany({}, function (err) {});
                style = " <b><i>";
                msg = "</b> purged all messages. </i>";

                let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg}); // luodaan databaseen viesti
                newMsg.save(function(err)
                {         
                    if(err) 
                    {
                        throw err;
                    }
                    else
                    {
                        updateDate();
                        io.emit('purge', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg}); 
                    }
                });
            }    
            else
            {
                callback("You don't have the rights to do that.");
            }
        }


        else if(msg.substr(0,5).toLowerCase() === '/nick') //vaihda nimesi
        {
            msg = msg.substr(5); //poistetaan viestistä /nick            

                var ind = msg.indexOf(' ');
                var newName = msg.substring(ind + 1);
                var regex = regexi;
        
                if(newName.toLowerCase() in fakeUsers || newName.match(regex) || newName.length > 13 || newName.length < 1)
                {
                    callback("That nickname is invalid or already taken!");
                    console.log ("nimi " + newName + " on jo käytössä");
                    console.log("Lista nimistä: " + Object.keys(users));
                }       
                else
                {
                   
                    let currentname = socket.username;             
                    if (currentname in admins)
                    {
                        delete users[socket.username]; // poistetaan vanha nimi 
                        delete admins[socket.useradminname];
    
                        socket.username = adminCrown + newName;  
                        users[socket.username] = socket; 
    
                        socket.useradminname = socket.username; 
                        admins[socket.useradminname] = socket;     
                    }  
                    else
                    {
                        delete users[socket.username]; // poistetaan vanha nimi                    
                        socket.username = newName;                
                        users[socket.username] = socket; 
                    }
                    
                    updateUsernames();
                    updateUsername();                
                    nameChangestart(currentname);   //nimenvaihdos on client puolella tullut päätökseen.    
                    
                    //fakeUsers.splice(fakeUsers.indexOf(socket.userfake), 1); 
                    delete fakeUsers[socket.userfake]; //ja poistetaan versio jossa on vain pienet kirjaimet
                    newName = newName.toLowerCase(); //nyt muutetaan data lowercase
                    socket.userfake = newName; //tilalle lowercase nimi
                    fakeUsers[socket.userfake] = socket; //lisätään arrayhyn virallinen lowercase nimimerkki, johon voi sitten verrata uusia syötettyjä nimiä
                                    
                    console.log("username changed to " + newName);
                    console.log("Lista nimistä lowercase: " + Object.keys(fakeUsers));
                    console.log("Lista nimistä näkyvä: " + Object.keys(users));
                    console.log("Lista nimistä admins: " + Object.keys(admins));
                }
                            
   
        }   



        else if(msg.substr(0,4).toLowerCase() === '/me ')
        {
            style = "<i><b>*";
            msg = "</b> " + msg.substr(4) + "<b>*</b></i>"; //poistetaan viestistä '/me '    
                    
            let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});  // luodaan databaseen viesti
            newMsg.save(function(err)
            {         
                if(err) 
                {
                    throw err;
                }
                else
                {
                    updateDate();
                    io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg}); 
                    console.log('message:', {user: socket.username, msg: data});
                }
            });                
            
        }
        else if(msg.substr(0,3).toLowerCase() === '/w ') //tällä komennolla voi lähettää yksityisviestin
        {
            msg = msg.substr(3); //poistetaan viestistä /w
            var ind = msg.indexOf(' ');
            if(ind !== -1)
            {
                var name = msg.substring(0, ind);
                var msg = msg.substring(ind + 1);

                if (name.toLowerCase() in fakeUsers)
                {
                    
                    fakeUsers[name.toLowerCase()].emit('whisper', {msg: msg, user: socket.username}); //lähetetään yksityisviesti
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
        else if(msg.substr(0,1).toLowerCase() === '/') //Tämä on siksi että jos kirjoittaa jonkun komennon väärin, se ei lähetä sitä chattiin.
        {
            //msg = msg.substr(1);
        }
                // else if(msg.substr(0,6) === '/kick ') //disconnectaa käyttäjä serveriltä
        // {
        //     msg = msg.substr(6); //poistetaan viestistä kick
        //     var ind = msg.indexOf(' ');
        //     if(ind !== -1)
        //     {
        //         var name = msg.substring(0, ind);
        //         var msg = msg.substring(ind + 1);
        //         if (name.toLowerCase() in fakeUsers)
        //         {
                   
        //             //io.emit('kick message', {user: socket.username}); 
        //             fakeUsers[name.toLowerCase()].disconnect(true);
        //         }
        //         else
        //         {
        //             callback('Kick did not work.');
        //         }
        //     }
        // }
        else //ilman komentoa lähetetään tavallinen viesti kaikille
        {   
            style = " <b>";   
            msg = ": </b>" + msg;
            let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg}); // luodaan databaseen viesti
            newMsg.save(function(err)
            {         
                if(err) 
                {
                    throw err;
                }
                else
                {
                    updateDate();
                    io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
                    console.log('message:', {user: socket.username, msg: data});
                }
            });
        }
    });
    
    //nimenvaihto
    socket.on('change user', function(data, callback)
        {   
              //Tässä muutetaan < ja > merkit niiden text counterparteiksi. Tarvittaessa voi lisätä enemmän merkkejä, jos vaikuttaa siltä, että tarvii.
            var chars = {'<':'&#60','>':'&#62'};
            data1 = data.replace(/[<>]/g, m => chars[m]);
            
            var regex = regexi;
            
            //if(data1.toLowerCase() in fakeUsers || !data1.match(regex) || data1.match(blockEmoji)) //jos nimi löytyy jo lowercase arraysta
            if(data1.toLowerCase() in fakeUsers || data1.match(regex) || data1.length > 13 || data1.length < 1)
            {
                callback(false);
                console.log ("nimi " + data + " on jo käytössä");
                console.log("Lista nimistä: " + Object.keys(users));
            }       
            else
            {
                callback(true);
                let currentname = socket.username;             
                //data = data.replace(/\s/g, ''); //poistetaan välilyönnit nimimerkistä 
                if (currentname in admins)
                {
                    delete users[socket.username]; // poistetaan vanha nimi 
                    delete admins[socket.useradminname];

                    socket.username = adminCrown + data1;  
                    users[socket.username] = socket; 

                    socket.useradminname = socket.username; 
                    admins[socket.useradminname] = socket;     
                }  
                else
                {
                    delete users[socket.username]; // poistetaan vanha nimi                    
                    socket.username = data1;                
                    users[socket.username] = socket; 
                }
                
                updateUsernames();
                updateUsername();                
                nameChangestart(currentname);   //nimenvaihdos on client puolella tullut päätökseen.    
                
                //fakeUsers.splice(fakeUsers.indexOf(socket.userfake), 1); 
                delete fakeUsers[socket.userfake]; //ja poistetaan versio jossa on vain pienet kirjaimet
                data1 = data1.toLowerCase(); //nyt muutetaan data lowercase
                socket.userfake = data1; //tilalle lowercase nimi
                fakeUsers[socket.userfake] = socket; //lisätään arrayhyn virallinen lowercase nimimerkki, johon voi sitten verrata uusia syötettyjä nimiä
                                
                console.log("username changed to " + data1);
                console.log("Lista nimistä lowercase: " + Object.keys(fakeUsers));
                console.log("Lista nimistä näkyvä: " + Object.keys(users));
                console.log("Lista nimistä admins: " + Object.keys(admins));
                    //console.log("Lista nimistäFAKE: " + Object.keys(fakeUsers));
            }
        });

    //bufferoitujen tietojen lähettäminen yhdellä paketilla.
    function mainLoop() 
    {
        
            if (bufferArray.length > 0)
            {
                io.emit('draw bufferarray', {bufferarray: bufferArray});
               // io.emit('draw line', { line: data.line, user: socket.username }); //lähetä piirto kaikkiin clientteihin      
                updateLines();
            }
            bufferArray = [];
       

        setTimeout(mainLoop, 50); //kutsuu funktiota uudelleen 25ms välein      
               
    }
    mainLoop();

    function updateDate()
    {
        date = new Date();
        year = date.getFullYear();
        month = date.getMonth();
        day = date.getDate();
        hours = date.getHours();
        minutes = date.getMinutes();
        timeHoursMins = ((hours<10?'0':'')+ hours +":" +(minutes<10?'0':'') + minutes);
        timeDayMonthYear = ((day<10?'0':'') + day + "/" + ((month+1)<10?'0':'') + (month+1) + "/" + year);
    }

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

    function hasJoined() //Tätä ei haluta tallentaa tietokantaan
    {
        style = " <i><b>";
        msg = "</b> joined the channel.</i>";
        updateDate();
        socket.broadcast.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
    }

    function hasLeft() //Tätä ei haluta tallentaa tietokantaan
    {
        style = " <i><b>";
        msg = "</b> left the channel.</i>";
        updateDate();
        socket.broadcast.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});

    }

    function isNowAdmin()
    {
        style = " <i><b>";
        msg = "</b> is now admin.</i>";
        let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
        newMsg.save(function(err)
        {
            if(err)
            {
                throw err;
            }
            else
            {
                updateDate();
                io.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
            }
        });
    }

    function nameChangestart(currentname)
    {
        currentname = currentname;
        style = "<b><i>*" + currentname + "</b> is now known as <b>"
        msg = "*</b></i>";
        let newMsg = new Chat({timestamp: timeHoursMins, style: style, user: socket.username, msg: msg}); // luodaan databaseen viesti
        newMsg.save(function(err)
        {         
            if(err) 
            {
                throw err;
            }
            else
            {
                updateDate();
                io.sockets.emit('new message', {timestamp: timeHoursMins, style: style, user: socket.username, msg: msg});
            }
        });
    }

    function updateLines()
    {
        var linelength = 0;
        for (var i in lineHistory) 
        {
            linelength += (lineHistory[i].length * 4 * 4) / 1024; //length*4 = 4 on muuttujien määrä arrayssa.
        }
        io.sockets.emit('get lines', linelength); //tässä on ensin muutettu viivan koko byteksi, sitten kilobyteksi        
    }

    function updateCanvas()
    {
        socket.emit('get linearray', { linehistory: lineHistory} );        
        updateLines();
    }

    function updateCanvasAll() //canvas päivitetään kaikille kumia käyttäessä. Kömpelöä, mutta toimii.
    {
        io.emit('clearit', true);
        //sama kun update canvas, mutta lähetetään line array kaikille clienteille.
        io.emit('get linearray', { linehistory: lineHistory} );
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



