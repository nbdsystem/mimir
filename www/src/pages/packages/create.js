import * as React from 'react';
import { useMutation } from 'react-query';

async function createPackage(newPackage) {
  const response = await fetch('//api.mimir.test/api/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newPackage),
  });
  const json = await response.json();
  return json;
}

export default function CreatePackage() {
  const ref = React.useRef(null);
  const mutation = useMutation({
    mutationFn: createPackage,
  });

  console.log(mutation);

  return (
    <main>
      <h1>Create package</h1>
      <form
        ref={ref}
        action="/api/packages/create"
        method="POST"
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(ref.current);
          mutation.mutate(Object.fromEntries(formData.entries()));
        }}
      >
        <div className="flex flex-col">
          <label htmlFor="package-name">Name</label>
          <input
            id="package-name"
            className="border border-gray-500"
            name="name"
            type="text"
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </main>
  );
}
