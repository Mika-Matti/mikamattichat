//Täällä tehdään kaikki tärkee chat kommunikointi serverin kanssa
 
let socket = io.connect();

$(function ()
{
       
  
     //NIMIMERKIN ASETTAMINEN
     $('#change').submit(function(e)
     {
         e.preventDefault();
         
         if($('#n').val().length > 0 && $('#n').val().length < 14)
         {
             socket.emit('new user', $('#n').val(), function(data)
             {
                 if(data)
                 {
                   //  $('.chatBottompre').hide();     //sulkee varoitusviestin nimimerkin puutteesta
                   //  $('.chatBottom').show();        //avaa chattiformin tilalle
                     $('.chatHeadertwo').hide();     //sulkee set nick-formin
                     $('.chatHeaderthree').show();   //ja avaa change nick-formin
                     $('.chatHeaderpre').hide();     //Tervetuloa otsikko sulkeutuu
                     $('.chatHeader').show();        //Ja uusi otsikko tulee tilalle                 
                     
                     
                 }
                 else
                 {
                     alert("That nickname is already taken!");
                 }
                 
             });
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
     //joined loppuu

     //has left announcement
     socket.on('left server', function(data)
     {
         $("#messages").append("<li><i><b>" + data.user + "</b>" + " has left the channel. </i></li>");
         //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
         scrollDown();
     });
     //left server loppuu
     //changed name alkaa
     socket.on('changed namestart', function(data)
     {
         $("#messages").append("<li><b><i>*" + data.currentname + "</b>" + " is now known as <b>" + data.user + "*</b>.</i></li>");
         //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
         scrollDown();
     });
            
      //NIMENVAIHTO 
     $('#changeagain').submit(function(e)
     {
         e.preventDefault();

         
             if($('#p').val().length > 0 && $('#p').val().length < 14)
             {
                 
                 socket.emit('change user', $('#p').val(), function(data)
                 {
                     if(data) //tarkistetaan onko nimi jo arrayssa
                     {
                         //alert("Nimi vaihdettu.");
                     }
                     else
                     {
                         alert("That nickname is already taken!");
                     }

                 });                              
                 
             }
             else //jos nimimerkki on alle 1 kirjainta tai yli 20 kirjainta pitk
             {
                 alert("Type your nickname (max. 13 letters)");
             }

             $('#p').val(''); //tyhjentää kentän            
         

     });

     //CHATVIESTINLÄHETTÄMINEN
     $('#send').submit(function(e)
     {
         e.preventDefault();

         if($('#m').val().length > 0)//katsotaan onko viesti tyhjä ehdolla
         {
             //server.js puolella sitten otetaan koppi tästä
             //socket.emit('chat message', $($('#m').val()).text(), function(data) tällä periaatteessa voisi sanitize tämän mutta /w ei toimisi
             socket.emit('chat message', $('#m').val(), function(data)
             {
                 alert("Bad whisper: " + data); // ottaa serveriltä callback viestit jos whisper on tyhjä tai käyttäjää ei ole
             });
             $('#m').val(''); //tyhjentää kentän
            // return false;
         }
         else
         {
             alert("Write a message.");
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
        scrollDown();
     });

     function displayMessages(data)
     {
     $("#messages").append("<li>" + data.timestamp + " <b>" + data.user + "</b>" + ": " + data.msg + "</li>");
     }
     function displayOldMessages(data)
     {
     $("#messages").append("<li>" + data.timestamp + " <b>" + data.user + "</b>" + ": " + data.msg + "</li>");
     }

     //viesti tulee clientside ikkunaan
     socket.on('new message', function(data)
     {
        //viestin lähetys
        displayMessages(data);
  
        //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
        scrollDown();

     });

     //yksityisviesti
     socket.on('whisper', function(data)
     {
          //viestin lähetys
          $("#messages").append("<li>" + getCurrentDate() + " <i style=\"color:purple;\">" + "<b style=\"color:purple;\">" + data.user + " whispers</b>" + ": " + data.msg + "</i></li>");
  
         //Käskee ohjelman scrollata näyttö alas uuden viestin tullessa
         scrollDown();
     });

});

 function scrollDown()
 {
     //ja alla laitetaan scrollbar alas, jotta uusin viesti olisi aina näkyvissä alhaalla aina viestin tullessa
         //Toistaiseksi tarvii ekan kerran scrollin ilmestyessä scrollata alas, mutta sen jälkeen toimii automaattisesti.
         //toisinsanoen pitäisi kai heti scrollin ilmestyessä kutsua scrolldownia
         var s = $(".chatMessages").scrollTop(),
             d = $(document.documentElement).height(),
             c = $(".chatMessages").height();
         var scrollPercent = (s / (d - c)) * 100;
         if ( (s / (d - c)) * 100 >= 90 )
         {       
                             
             $(".chatMessages").stop().animate({ scrollTop: $(".chatMessages")[0].scrollHeight}, 0);
         
         }           
         //scrollaustestailu loppuu
 }

 // TIMESTAMP
 function getCurrentDate() 
 {
     var currentDate = new Date();
     // var day = (currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate();
     // var month = ((currentDate.getMonth() + 1) < 10 ? '0' : '') + (currentDate.getMonth() + 1);
     //var year = currentDate.getFullYear();
     var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
     var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
     //var second = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();

     //return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
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



 
