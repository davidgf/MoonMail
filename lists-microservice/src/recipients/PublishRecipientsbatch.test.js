import '../lib/specHelper';
import ImportRecipientsCsv from './ImportRecipientsCsv';

// const validEmailsCsvContent = fs.readFileSync('./fixtures/250_valid_recipients.csv').toString();
// const validEmailsCsvBomContent = fs.readFileSync('./fixtures/250_valid_recipients_with_bom.csv').toString();
// const with3InvalidEmailsCsvContent = fs.readFileSync('./fixtures/247_valid_3_invalid_recipients.csv').toString();
// const with8DuplicatedEmailsCsvContent = fs.readFileSync('./fixtures/242_valid_8_duplicated_recipients.csv').toString();
const fileName = 'my-user.my-list.csv';
const metadataMapping = {};
const offset = 0;

describe('.execute()', () => {
  it('should call the trigger save recipients service with correct parameters', async () => {
    // const service = ImportRecipientsCsv.create(
    //   { csvString: validEmailsCsvContent, metadataMapping, fileName },
    //   new AWS.Lambda(),
    //   { getRemainingTimeInMillis: () => 300000 }
    // );
    // const result = await service.execute();
  });

  context('when there is no offset', () => {
    it('should create import status');
  });
  context('when there is offset', () => {
    it('should be provided to trigger save recipients service');
  });
  context('when the task finished successfully', () => {
    it('should update import status with success');
  });
  context('when the task fails', () => {
    it('should update import status with failed');
  });
  context('when the task has timed out', () => {
    it('should not update import status');
    it('should invoke the function again providing current status');
  });
});
