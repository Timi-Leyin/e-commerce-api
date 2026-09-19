const mainConfig = {
  limit: "20mb",
  parameterLimit: 20000,
  origin: "*",
  MAX_LIMIT:50,

  routes: {
    login: "/login",
    signup: "/signup",
    forgottenPasword: "/forgotten-password",
    verifyAuth: "/verify",
    withGoogle: "/google",
    googleCallback: "/google/callback",

    userProfile: "/profile", // GET | PUT
    userUploadAvatar: "/upload/avatar",

    becomeSeller: "/become",
    sellerProfile: "/profile",
    sellerProfileAvatar: "/profile/avatar",

    newProduct: "/product/new",
    updateProduct: "/product/update",
    allUsers: "/users",
    deleteProduct: "/product/delete/:id",

    addCart: "/add",
    checkout: "/checkout",

    addAddressBook: "/add",
    editAddressBook: "/edit/:id",
    defaultAddressBook: "/default/:id",
    deleteAddressBook: "/:id",
  },
  status: {
    // infomation
    continue: 100,
    processing: 102,
    //success
    ok: 200,
    created: 201,
    noContent: 204,
    // client
    bad: 400,
    unauthorized: 401,
    paymentRequired: 402,
    forbidden: 403,
    notFound: 404,
    notAcceptable: 406,
    requestTimeout: 408,
    conflict: 409,
    gone: 410,
    tooLarge: 413,
    unsupportedMediaType: 415,
    unavailable: 451, //or 503
    tooManyRequests: 429,
    // server
    serverError: 500,
    insufficientStorage: 507,
    authRequired: 511,
  },
};

export default mainConfig;
