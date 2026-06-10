(function (root) {
    "use strict";

    var streamers = [
        { id: "sd-strm-01", username: "zb2t", platform: "kick" },
        { id: "sd-strm-02", username: "olrd", platform: "kick" },
        { id: "sd-strm-03", username: "nightfall", platform: "kick" },
        { id: "sd-strm-04", username: "crimsonwave", platform: "kick" },
        { id: "sd-strm-05", username: "vortexlive", platform: "kick" },
        { id: "sd-strm-06", username: "echochamber", platform: "kick" }
    ];

    var book = {
        title: "The Red Ledger",
        author: "ZB2T",
        subtitle: "An account of the OLRD, kept honest",
        pages: [
            {
                id: "sd-pg-01",
                title: "The First Broadcast",
                body: "It started with one bad camera and a chat that would not go to sleep.\n\nNobody planned a collective. We planned to go live, and the room filled because the room wanted somewhere to be. By the third night there were names people recognised, and a name people argued about. That argument was the beginning. You only fight over a thing once it is worth keeping.\n\nWe never wrote a mission. We just kept showing up, and showing up turned out to be the whole trick."
            },
            {
                id: "sd-pg-02",
                title: "Rules Of The Red",
                body: "There are three, and they have not changed.\n\nShow up. The schedule is a promise, and a broken promise costs more than a quiet night.\n\nHold the line. When a stream goes sideways, you do not run and you do not lie about it on camera. You wear it.\n\nLeave the room better. Every night you either add to the place or you take from it. There is no third option, no matter how the chat spins it."
            },
            {
                id: "sd-pg-03",
                title: "The Roster",
                body: "A name on the wall is not a reward. It is a debt.\n\nWhen someone joins the roster, the audience is told where to come back to. That is a real thing we are handing out, and we do not hand it out for noise. We hand it out for the ones who stayed warm when the numbers were cold.\n\nOrder the wall the way you would seat a table: by trust earned, not by the loudest voice in the lobby."
            },
            {
                id: "sd-pg-04",
                title: "Bad Nights",
                body: "We keep the bad nights in here on purpose.\n\nThe night the server went dark for two hours. The night a name we trusted walked out mid-stream and did not come back. The night the chat turned on itself and we let it run too long before we stepped in.\n\nA ledger that only records the wins is a poster, not a record. Posters lie politely. This book does not."
            },
            {
                id: "sd-pg-05",
                title: "What We Keep",
                body: "Channels go offline. Trends rot. The platform changes its mind about us twice a year.\n\nWhat survives is smaller and harder to kill: a way of treating the room, a refusal to fake the count, a banner that means the same thing on a slow Tuesday as it does on the biggest night of the year.\n\nIf you are reading this, the banner held long enough to reach you. Keep it honest. Add your night, and pass the book on."
            }
        ]
    };

    root.OLRD = root.OLRD || {};
    root.OLRD.seed = {
        streamers: streamers,
        book: book
    };

})(typeof self !== "undefined" ? self : this);
