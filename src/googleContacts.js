const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/contacts'

let tokenClient = null
let accessToken = null

/**
 * Initialises (or reuses) the OAuth token client.
 * Resolves with a valid access token.
 */
export function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (accessToken) { resolve(accessToken); return }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) { reject(response); return }
        accessToken = response.access_token
        resolve(accessToken)
      },
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

/**
 * Creates a Google Contact from a member object.
 * @param {object} member - { name, phone, email, dob, occupation }
 */
export async function createGoogleContact(member) {
  const token = await getAccessToken()

  const body = {
    names: [{ displayName: member.name }],
    phoneNumbers: member.phone ? [{ value: member.phone, type: 'mobile' }] : [],
    emailAddresses: member.email ? [{ value: member.email }] : [],
    birthdays: member.dob
      ? [{ date: {
            year:  parseInt(member.dob.split('-')[0]),
            month: parseInt(member.dob.split('-')[1]),
            day:   parseInt(member.dob.split('-')[2]),
          }}]
      : [],
    occupations: member.occupation ? [{ value: member.occupation }] : [],
    biographies: [{ value: 'Brummana Meet the Generations member', contentType: 'TEXT_PLAIN' }],
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to create contact')
  }

  return await res.json()
}