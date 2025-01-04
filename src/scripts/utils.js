function cleanRedirectUrl(redirectUrl, basePathSegment) {
    let splits = redirectUrl.split('/');

    if (splits.length > 2) {
        if (splits[0] === splits[1] || (splits[0] === basePathSegment)) {
            return splits.slice(1).join('/');
        }
    }
    return redirectUrl;
}

module.exports = {
    cleanRedirectUrl
}; 