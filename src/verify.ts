import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function verify(
  github_org: string,
  github_repo: string,
  github_commit: string,
  contract_name: string,
  build_image: string,
  expected_checksum: string
): Promise<boolean> {
  const result = await execAsync(`cosmwasm-verify \
    ${github_org} \
    ${github_repo} \
    ${github_commit} \
    ${contract_name} \
    ${build_image} \
    ${expected_checksum}`);

  const { success }: { success: boolean } = JSON.parse(
    result.stdout.trimEnd().split('\n').pop() as string
  );

  return success;
}
