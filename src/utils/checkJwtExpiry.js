const { jwtDecode } = require('jwt-decode');

export const checkJwtAndRedirect = (navigate) => {
    const token = localStorage.getItem("token");
    if (!token) {
        localStorage.clear();
        navigate("/");
        return false;
    }

    try {
        const { exp } = jwtDecode(token);
        if (Date.now() >= exp * 1000) {
            localStorage.clear();
            navigate("/");
            return false;
        }
        return true;
    } catch (err) {
        localStorage.clear();
        navigate("/");
        return false;
    }
};

export const redirectIfLoggedIn = (navigate) => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
        const { exp } = jwtDecode(token);
        if (Date.now() < exp * 1000) {
            navigate("/dashboard");
            return true;
        }
    } catch (err) {
        console.log(err);
        localStorage.removeItem("token");
    }
    return false;
};