import { PlayerNameService } from './player-name.service';

describe('PlayerNameService', () => {
  const storageKey = 'rikken-player-names-v1';
  let service: PlayerNameService;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    service = new PlayerNameService();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  it('returns remembered names as optional suggestions', () => {
    service.remember(['Noor', 'Jules', 'Sam']);

    expect(service.getSuggestions()).toEqual(['Noor', 'Jules', 'Sam']);
  });

  it('accepts arbitrary names and leaves lineup ordering to the caller', () => {
    service.remember(['Luca', 'Mila', 'Pim']);
    const chosenLineup = ['Pim', 'Luca', 'Mila', 'Noor'];

    expect(chosenLineup).toEqual(['Pim', 'Luca', 'Mila', 'Noor']);
    expect(service.getSuggestions()).toEqual(['Luca', 'Mila', 'Pim']);
  });
});