let db = {
    users: [
        {
            userId: 'ejsf143nm53sg54eererg',
            email: 'user@email.com',
            handle: 'user',
            createdAt: '2011-10-05T14:48:00.000Z',
            imageURl: 'image/dsdhsj/jkfbjb',
            bio: 'hello! i am a user',
            website: 'https://user.com',
            location: 'London, UK'
        }
    ],
    recipes: [
        {
            userHandle: 'user',
            body: 'this is the recipe body',
            createdAt: '2011-10-05T14:48:00.000Z',
            likeCount: 5,
            commentCount: 2
        }
    ],
    comments: [
        {
            userHandle: 'user',
            recipeId: 'medbanbnzbhsagdjb',
            body: 'nice one! love the taste',
            createdAt: '2011-10-05T14:48:00.000Z'
        }
    ],
    notifications: [{
        recipient: 'user',
        sender: 'john',
        read: 'true | false',
        recipeId: 'jfjshfjabhbadhjf'
        type: 'like | comment',
        createdAt: '2011-10-05T14:48:00.000Z'
    }]
};

const userDetails = {

    credentials: {
        userId: 'ejsf143nm53sg54eererg',
        email: 'user@email.com',
        handle: 'user',
        createdAt: '2011-10-05T14:48:00.000Z',
        imageURl: 'image/dsdhsj/jkfbjb',
        bio: 'hello! i am a user',
        website: 'https://user.com',
        location: 'London, UK'
    },

    likes: [
        {
            userHandle: "user",
            recipeId: "dwhjsbvsbcnsb"
        },
        {
            userHandle: "user",
            recipeId: "dwhjsbvsbcnsb"
        }
    ]
}