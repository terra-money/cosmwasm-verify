require('dotenv').config();

import Express from 'express';
import BodyParser from 'body-parser';

import axios from 'axios';
import * as http from 'http';
import * as https from 'https';

import { verify } from './verify';

const LCD_URL = process.env.LCD_URL || 'https://bombay-lcd.terra.dev';
const LISTEN_PORT = process.env.LISTEN_PORT || '8080';

const ax = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 15000,
});

const app = Express();
const jsonParser = BodyParser.json();

app.post('/verify', jsonParser, async (req, res) => {
  if (
    !(
      req.body &&
      req.body['github_org'] &&
      req.body['github_repo'] &&
      req.body['github_commit'] &&
      req.body['contract_name'] &&
      req.body['builder_image'] &&
      req.body['code_id']
    )
  ) {
    res.status(400);
    return res.json({ verified: false, message: 'invalid arguments' });
  }

  const {
    github_org,
    github_repo,
    github_commit,
    contract_name,
    builder_image,
    code_id,
  } = req.body;

  if (
    !(await validate_commit_hash(
      `https://github.com/${github_org}/${github_repo}/commit/${github_commit}`
    ))
  ) {
    res.status(400);
    return res.json({
      verified: false,
      message: `invalid arguments - cannot validate github_commit "https://github.com/${github_org}/${github_repo}/commit/${github_commit}"`,
    });
  }

  const code_info: {
    data: {
      code_info: {
        code_id: string;
        code_hash: string;
        creator: string;
      };
    };
  } = await ax.get(`${LCD_URL}/terra/wasm/v1beta1/codes/${code_id}`);

  const expected_checksum = Buffer.from(
    code_info.data.code_info.code_hash,
    'base64'
  ).toString('hex');

  try {
    const verified = await verify(
      github_org,
      github_repo,
      github_commit,
      contract_name,
      builder_image,
      expected_checksum
    );

    res.status(200);
    return res.json({
      verified,
      message: verified ? 'ok' : 'verify failed',
    });
  } catch (err) {
    res.status(500);
    return res.json({
      verified: false,
      message: err,
    });
  }
});

const port = parseInt(LISTEN_PORT);
app.listen(port, '0.0.0.0', () => {
  console.info(`cosmwasm-verify app listening on port ${port}`);
});

async function validate_commit_hash(url: string): Promise<boolean> {
  try {
    await ax.get(url);
    return true;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        return false;
      }
    }

    throw err;
  }
}
