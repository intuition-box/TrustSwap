import assert from "assert";
import { 
  TestHelpers,
  Factory_PairCreated
} from "generated";
const { MockDb, Factory } = TestHelpers;

describe("Factory contract PairCreated event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Factory contract PairCreated event
  const event = Factory.PairCreated.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Factory_PairCreated is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Factory.PairCreated.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualFactoryPairCreated = mockDbUpdated.entities.Factory_PairCreated.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedFactoryPairCreated: Factory_PairCreated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      token0: event.params.token0,
      token1: event.params.token1,
      pair: event.params.pair,
      _3: event.params._3,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualFactoryPairCreated, expectedFactoryPairCreated, "Actual FactoryPairCreated should be the same as the expectedFactoryPairCreated");
  });
});
