/*
	This bot is written by MikeB and updated by Mike Wills
*/

var IDLELIMIT = (60 * (60*1000)); // 60 minutes
var SONGLIMIT = 480; // 8 minutes

var usercache;
var songtimer;
var hungSongCheck;

function checkIdle()
{
	var date = new Date();

	var waitlist = API.getWaitList();
		
	for ( var i in waitlist )
	{
		for ( var j in usercache )
		{
			if ( waitlist[i].id == usercache[j].id )
			{
				var timedelta = date.getTime() - usercache[j].lastactive;
				if ( (timedelta > IDLELIMIT) && (usercache[j].idlenotify == 0) )
				{
					API.sendChat('@' + usercache[j].username + ' you have been idle for ' + Math.round(timedelta/(60*1000)) + ' minutes.  Please keep chatting in the room if you are going to DJ.  Thanks!');
					console.log('Warned ' + usercache[j].username + ' of excessive idle time.');
					usercache[j].idlenotify = 1;
					
					setTimeout(function(userid) {
						for ( var k in usercache )
						{
							if ( userid == usercache[k].id )
							{
								var date = new Date();
								if ( (date.getTime() - usercache[k].lastactive) > IDLELIMIT )
								{
									API.moderateRemoveDJ(usercache[k].id);
									API.sendChat('@' + usercache[k].username + ' you have been removed for idle DJing.  Please keep chatting in the room if you are going to DJ.  Thanks!');
									usercache[k].idlenotify = 0;
									console.log('Removed ' + usercache[j].username + ' for excessive idle time.');
								}
							}
						}
					}, (5*(60*1000)), usercache[j].id);
					
				}
			}
		}
	}
}

function updateIdle(id)
{
	for ( var i in usercache )
	{
		if ( id == usercache[i].id )
		{
			var date = new Date();
			usercache[i].lastactive = date.getTime();
			usercache[i].idlenotify = 0;
		}
	}
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

function isBouncer(id)
{
	var staff = API.getStaff();
	
	for ( var i in staff )
	{
		if (( staff[i].permission > 1 ) && ( staff[i].id == id ))
		{
			return 1;
		}	
	}

	return 0;	
}

function isHost(id)
{
	var staff = API.getStaff();
	
	for ( var i in staff )
	{
		if ( (( staff[i].permission == 4 ) || ( staff[i].permission == 5 )) && ( staff[i].id == id ))
		{
			return 1;
		}	
	}

	return 0;	
}

function DJ_ADVANCE(obj)
{
	// Clear the timer if the skip worked.
    clearTimeout(hungSongCheck);

	if ( songtimer != null)
	{
		clearTimeout(songtimer);
		songtimer = null;
	}	
	    
	if (obj.lastPlay != null)
	{
		API.sendChat(obj.lastPlay.media.attributes.author + " - " + obj.lastPlay.media.attributes.title + " :arrow_up: " + obj.lastPlay.score.positive + " :arrow_down: " + obj.lastPlay.score.negative + " :star: " + obj.lastPlay.score.curates);
	}
	
	setTimeout(function() {
		$('#woot').click() 
	}, (10*1000));

	checkIdle();
	
	if (obj.media != null)
	{
		if (obj.media.duration > SONGLIMIT)
		{
			var songlimitmins = SONGLIMIT / 60;
			API.sendChat('@' + obj.dj.username + ' - this song is excessively long, please skip before ' + songlimitmins.toFixed(1) + ' minutes.  Thanks!');
			songtimer = setTimeout(function(djid, songid) {
				var curdj = API.getDJ();
				var curmedia = API.getMedia();
				if ( (djid == curdj.id) && (songid == curmedia.id) )
				{
					API.sendChat('@' + obj.dj.username + ' - you are about to exceed the song time limit of ' + songlimitmins.toFixed(1) + ' minutes, please skip to the next DJ.  Thanks!');
					songtimer = setTimeout(function(djid, songid) {
						var curdj = API.getDJ();
						var curmedia = API.getMedia();
						if ( (djid == curdj.id) && (songid == curmedia.id) )
						{
							API.moderateForceSkip();
							API.sendChat('@' + obj.dj.username + ' - you have exceeded the song time limit of ' + songlimitmins.toFixed(1) + ' minutes.');		
							console.log('Skipped ' + obj.dj.username + '\'s song for exceeding the time limit.');				
						}	
					}, (30*1000), djid, songid);
				}
			}, ((SONGLIMIT - 30)*1000), obj.dj.id, obj.media.id);
		}

		// Monitor for a hung song
		hungSongCheck = setTimeout(function() {
        	API.sendChat("Hung song, skipping for you.");
        	API.moderateForceSkip();
      	}, (data.media.duration + 10) * 1000 );
	}
}

function USER_JOIN(obj)
{
	var date = new Date();
	obj.lastactive = date.getTime();
	obj.idlenotify = 0;
	usercache.push(obj);
}

function USER_LEAVE(obj)
{
	for ( var i in usercache )
	{
		if ( obj.id == usercache[i].id )
		{
			usercache.splice(i, 1);
		}
	}
}

function WAIT_LIST_UPDATE(obj)
{
	checkIdle();
}

function DJ_UPDATE(obj)
{
	checkIdle();
}

function CHAT(obj)
{
	updateIdle(obj.fromID);

	if ( obj.message == "!skip" )
	{
		if ( isBouncer(obj.fromID) )
		{
			API.moderateForceSkip();
			API.sendChat('@' + obj.from + ' - attempted to skip the current song.');
			console.log(obj.from + ' had me skip the song.');
		}
	}
	
	else if ( obj.message == "!reload" )
	{
		if ( isHost(obj.fromID) )
		{
			API.sendChat('@' + obj.from + ' - attempting to reload.');
			setTimeout(function() {
				location.reload(true);
			}, (3*1000));
		}
	}
	
	else if ( obj.message == "!allowsong" )
	{
		if ( isBouncer(obj.fromID) )
		{
			if ( songtimer != null )
			{
				clearTimeout(songtimer);
				songtimer = null;
				API.sendChat('@' + obj.from + ' - I will allow this song to play.');
				console.log(obj.from + ' had me allow a song longer than the time limit.');
			}
		}
	}
	
	else if ( obj.message == "!idle" )
	{
		if ( isBouncer(obj.fromID) )
		{
			var idlelist = new Array();
			var output = "The most idle DJs are: ";
			var waitlist = API.getWaitList();
			var date = new Date();

			waitlist.push(API.getDJ());
		
			for ( var i in waitlist )
			{
				for ( var j in usercache )
				{
					if ( waitlist[i].id == usercache[j].id )
					{
						idlelist.push({
							username: usercache[j].username,
							time: Math.round((date.getTime() - usercache[j].lastactive)/(60*1000))
						});
					}
				}
			}
		
			if ( idlelist != null )
			{
				idlelist = sortByKey(idlelist, 'time');
			
				for (var i=0; (i < 5) && (i < idlelist.length); i++)
				{
					output += idlelist[i].username + ' ' + idlelist[i].time + 'min  ';
				}
			}
			else
			{
				output = 'There are no active DJs or waitlist';
			}
		
			API.sendChat(output);
			console.log(obj.from + ' requested the idle times.');
		}
	}
}

function USER_SKIP(obj)
{
	updateIdle(obj.id);
}

function USER_FAN(obj)
{
	updateIdle(obj.id);
}

function CURATE_UPDATE(obj)
{
	updateIdle(obj.user.id);
}

function INIT()
{
	var users = API.getUsers();
	var date = new Date();
	for ( var i in users )
	{
		users[i].lastactive = date.getTime();
		users[i].idlenotify = 0;

	}
	usercache = users;
	
	$('#playback').css('display', 'none'); // hide video for the bot
	API.setVolume(0);

	API.sendChat('I\'m back!');
	console.log("Bot is running");
}

API.on(API.DJ_ADVANCE, DJ_ADVANCE);
API.on(API.USER_JOIN, USER_JOIN);
API.on(API.USER_LEAVE, USER_LEAVE);
API.on(API.WAIT_LIST_UPDATE, WAIT_LIST_UPDATE);
API.on(API.DJ_UPDATE, DJ_UPDATE);
API.on(API.CHAT, CHAT);
API.on(API.USER_SKIP, USER_SKIP);
API.on(API.USER_FAN, USER_FAN);
API.on(API.CURATE_UPDATE, CURATE_UPDATE);

setTimeout(function () {INIT();}, (5*1000));