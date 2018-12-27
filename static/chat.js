//Täällä tehdään kaikki tärkee chat kommunikointi serverin kanssa
 
//let socket = io.connect();
let socket = io({transports: ['websocket'], 
                upgrade: false, });

$(function ()
{
       
  
    //NIMIMERKIN ASETTAMINEN
    $('#change').submit(function(e)
    {
        e.preventDefault();
        var hasSpace = $('#n').val().indexOf(' ')>-1; 
        var hasSpace2 = $('#n').val().indexOf(' ')>-1; //erilainen space
        if($('#n').val().length > 0 && $('#n').val().length < 14 && !hasSpace && !hasSpace2)
        {
            socket.emit('change user', $('#n').val(), function(data)
            {
                if(data)
                {
                    //$('.chatHeadertwo').hide();     //sulkee set nick-formin
                   // $('.chatHeaderthree').show();   //ja avaa change nick-formin
                    $('.chatHeaderpre').hide();     //Tervetuloa otsikko sulkeutuu
                    $('.chatHeader').show();        //Ja uusi otsikko tulee tilalle                     
                }
                else
                {
                    alert("That nickname is invalid or already taken!");
                }                 
            });
        }
        else if(hasSpace || hasSpace2)
        {
            alert("Don't use spaces in your nickname.");
        }
        else //jos nimimerkki on alle 1 kirjainta tai yli 13 kirjainta pitkä
        {
            alert("Type your nickname (max. 13 letters)");
        }

        $('#n').val(''); //tyhjentää kentän      
    });
     
    //Kirjoita tähän kuinka käyttäjänimi ilmestyy huonelistalle
    socket.on('get users', function(data)
    {
        var html = '';
        for(i = 0; i < data.length; i++)
        {
            html += '<li class="usernames"><b>' + data[i] + '</b></li>';
        }
        $("#usernames").html(html);         
    });    
    //HUONELISTALOPPUU
    //kokeillaan lisätä vain oma nimi ylhäälle
    socket.on('get user', function(data)
    {
        var html = '';
        html += 'Your current nickname is "' + data.user + '"';
        $("#nickname").html(html); 
    });
    //NIMENVAIHTO LOPPUU 
    //TÄHÄN TULEE CONNECTIONS MÄÄRÄ JOKA MENEE 
    socket.on('get connections', function(data)
    {
        var html = '';
        html += "(" + data + ")";
        $("#connections").html(html);
    });
    //CONNECTIONS LOPPUU

    //has joined announcement
    socket.on('joined server', function(data)
    {
        $("#messages").append("<li><i><b>" + data.user + "</b>" + " has joined the channel. </i></li>");
        //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
        scrollDown();
    });
    //has left announcement
    socket.on('left server', function(data)
    {
        $("#messages").append("<li><i><b>" + data.user + "</b>" + " has left the channel. </i></li>");
        scrollDown();
    });
    //changed name alkaa
    socket.on('changed namestart', function(data)
    {
        $("#messages").append("<li><b><i>*" + data.currentname + "</b>" + " is now known as <b>" + data.user + "*</b></i></li>");
        scrollDown();
    });
            


    //CHATVIESTINLÄHETTÄMINEN
    $('#send').submit(function(e)
    {
        e.preventDefault();

        if($('#m').val().length > 0)//katsotaan onko viesti tyhjä ehdolla
        {

            //server.js puolella sitten otetaan koppi tästä
            socket.emit('chat message', $('#m').val(), function(data)
            {
                alert("Bad whisper: " + data); // ottaa serveriltä callback viestit jos whisper on tyhjä tai käyttäjää ei ole
            });
            $('#m').val(''); //tyhjentää kentän
            // return false;
        }
        else
        {
            //alert("Write a message.");
            // return false;
        }
    });

    //vanhojen viestin lataaminen
    socket.on('load old msgs', function(docs) 
    {
        for(i = docs.length-1; i >= 0; i--)  //tuodaan reversenä jotta viimeisin
        {
            displayOldMessages(docs[i]);
        }        
        //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
        $(".chatMessages").stop().animate({ scrollTop: $(".chatMessages")[0].scrollHeight}, 0);
    });

    function displayMessages(data)
    {
        $("#messages").append("<li>" + data.timestamp + " <b>" + data.user + "</b>" + ": " + data.msg + "</li>");
    }
    function displayOldMessages(data)
    {
       $("#messages").append("<li>" + data.timestamp + " <b>" + data.user + "</b>" + ": " + data.msg + "<b style=\"color:red; font-size: 10px;\"> [" + data.oldmessagetime +"]</b></li>");
    }

    //viesti tulee clientside ikkunaan
    socket.on('new message', function(data)
    {
        //viestin lähetys
        displayMessages(data);
        scrollDown();
    });

    //yksityisviesti
    socket.on('whisper', function(data)
    {
        //viestin lähetys
        $("#messages").append("<li>" + getCurrentDate() + " <i style=\"color:purple;\">" + "<b style=\"color:purple;\">" + data.user + " whispers</b>" + ": " + data.msg + "</i></li>");
        scrollDown();
    });
});

function scrollDown()
{
    //alla laitetaan scrollbar alas, jotta uusin viesti olisi aina näkyvissä alhaalla aina viestin tullessa
    var s = $(".chatMessages").scrollTop(),
        d = $(document.documentElement).height(),
        c = $(".chatMessages").height();
        var scrollPercent = (s / (d - c)) * 100;
        if ( scrollPercent >= 90 )
        {    
            $(".chatMessages").stop().animate({ scrollTop: $(".chatMessages")[0].scrollHeight}, 0);
        }         
}

// TIMESTAMP clientsidessä
function getCurrentDate() 
{
    //whisperviestit soveltavat clientinpuolella tehtyä timestamppia, sillä niitä ei tallenneta databaseen tällä hetkellä ainakaan.
    var currentDate = new Date();
    var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
    var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
    return hour + ":" + minute;          
}
//lista tämän hetken komennoista
function help() 
{
    alert("mikamattiChat -- The more I add features the more I add helpful tips here.\n"
    + "\nSetting your nickname:"
    + "\nYour nickname has to be 1-13 characters long."
    + "\nAny spaces in your nickname will be removed. This rule mainly exists to help me, the programmer.\n"
    + "\nList of current /commands:"
    + "\n/w username message -- You can send a private message to anyone in the room by typing /w then their username and then your message.\n"
    + "\nHave fun.");
}
//lähetä kuva chattiin
function tempButton()
{
    alert("Feature unavailable.");
}



 
