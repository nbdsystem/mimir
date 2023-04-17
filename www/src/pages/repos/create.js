export default function CreateRepoPage() {
  return (
    <>
      <h1>Create a repo</h1>
      <form action="/api/repos" method="POST">
        <div>
          <label htmlFor="owner">Owner</label>
          <input id="owner" name="owner" type="text" required />
        </div>
        <div>
          <label htmlFor="repo">Name</label>
          <input id="repo" name="repo" type="text" required />
        </div>
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
