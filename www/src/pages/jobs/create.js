export default function CreateJobPage() {
  return (
    <>
      <main>
        <h1>Create a job</h1>
        <form action="/api/jobs/create" method="POST">
          <button type="submit">Submit</button>
        </form>
      </main>
    </>
  );
}
