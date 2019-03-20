const { Observable } = require('rxjs');
const { filter } = require('rxjs/operators');

const o = new Observable(subscriber => {
  subscriber.next({ event: 'browser-started', data: 'test' });
  subscriber.next({ event: 'update-progress', data: 1337 });
});

o.pipe(filter(({ event }) => event === 'browser-started')).subscribe(console.log);
o.pipe(filter(({ event }) => event === 'update-progress')).subscribe(console.log);