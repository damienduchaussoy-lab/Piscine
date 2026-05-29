exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { base64, mediaType } = body;
  if (!base64 || !mediaType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing base64 or mediaType' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: 'Cette photo montre une bandelette de test pour piscine et son flacon de reference AquaChek (ou similaire). Analyse les couleurs des pads de la bandelette en les comparant au tableau de reference visible sur le flacon. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni apres, sans balises markdown. Format exact: {"ph": valeur_ou_null, "chlore": valeur_ou_null, "tac": valeur_ou_null, "stab": valeur_ou_null, "notes": "explication courte en francais"}. Utilise null si un pad nest pas lisible. ph entre 6.2 et 8.4, chlore entre 0 et 10, tac entre 0 et 240, stab entre 0 et 300.'
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message || 'API error' })
      };
    }

    const rawText = data.content && data.content[0] ? data.content[0].text : '';
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unknown error' })
    };
  }
};
