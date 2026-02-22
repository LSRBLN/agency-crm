const axios = require('axios');

async function publishToMeta({ accessToken, pageId, message, link }) {
    if (!accessToken) throw new Error('Meta Access Token fehlt');
    if (!pageId) throw new Error('Meta PAGE_ID fehlt');

    const payload = {
        message,
    };

    if (link) payload.link = link;

    const response = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        payload,
        { params: { access_token: accessToken }, timeout: 15000 },
    );

    return {
        provider: 'meta',
        postId: response.data?.id || null,
        raw: response.data,
    };
}

async function publishToLinkedIn({ accessToken, ownerUrn, message }) {
    if (!accessToken) throw new Error('LinkedIn Access Token fehlt');
    if (!ownerUrn) throw new Error('LinkedIn Owner URN fehlt');

    const payload = {
        author: ownerUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: message },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
    };

    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', payload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
        },
        timeout: 15000,
    });

    return {
        provider: 'linkedin',
        postId: response.headers['x-restli-id'] || null,
        raw: response.data,
    };
}

module.exports = {
    publishToMeta,
    publishToLinkedIn,
};
