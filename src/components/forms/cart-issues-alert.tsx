type CartIssuesAlertProps = {
  issues: string[];
};

export function CartIssuesAlert({ issues }: CartIssuesAlertProps) {
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2"
      role="alert"
    >
      <p className="font-semibold">Review your cart before continuing</p>

      <ul className="mt-2 list-disc space-y-1 pl-5">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>

      <p className="mt-2">
        Return to the cart to remove unavailable items or review updated prices.
      </p>
    </div>
  );
}