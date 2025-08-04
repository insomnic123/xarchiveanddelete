I wanted to start my Twitter anew, but saw that all platforms which offer to delete your tweets cost money. Thinking they were being greedy, I thought this could be a fun project to embark on; creating my own deleting platform for free! Turns out, they cost money because X's API is egregiously expensive and the free version is incredibly restrictive; I was only able to do 4 tests an hour and then after a few hours couldn't test anymore cuz all the quotas were hit. But on the final tests, it worked swell!

If you want to run this specifically in spite of the very limited capabilities, email qaziayn@gmail.com with the headline "X program config help!

---- This is in the page.js but will paste it here too ----

            THIS IS A TEST APP -- As much as I would love to make it official, X has a very very very restrictive plan. If it doesn't work, it's likely due to the rate limits. If you somehow know someone who can get the free plan to be more than a joke please let them know T_T
            
            • If you want to see this function, feel free to create your own X project with all the scopes and copy the credentials into a .env.local! The .env setup is:
            
            NEXTAUTH_URL
            NEXTAUTH_SECRET
            TWITTER_CLIENT_ID 
            TWITTER_CLIENT_SECRET