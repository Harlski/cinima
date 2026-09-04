# Share visits are counted from a client beacon, not from HTML or Share preview fetches

Social crawlers request Share preview HTML and PNGs; counting those would inflate view stats. A Share visit is a human opening the SPA page, which POSTs an unauthenticated beacon with kind, optional Short Share code, and channel (web vs pay). Pay intent is a second beacon when the recipient taps Already Installed, Get Nimiq Pay, or Explore CINIMA. Crawlers never run that JS, so they are excluded by construction.
