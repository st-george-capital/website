import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function CapstoneSpotlight() {
  return (
    <section className="capstone-spotlight">
      <div className="capstone-heading">
        <p className="eyebrow">SGC Research / Fixed Income</p>
        <span>Portfolio optimization</span>
      </div>
      <div className="capstone-body">
        <div>
          <h2>
            Replicating a bond index.
            <br />
            Adapting to the regime.
          </h2>
          <p>
            A fixed-income decision-support framework combining Hull–White
            term-structure modelling, regime detection, and portfolio
            optimization to study replication of the Bloomberg U.S. Aggregate
            Bond Index.
          </p>
          <div className="capstone-methods">
            <span>Term structures</span>
            <span>Regime detection</span>
            <span>Convex optimization</span>
          </div>
        </div>
        <div
          className="capstone-regimes"
          aria-label="Three portfolio objectives"
        >
          <div>
            <span>01 / Bull</span>
            <h3>Risk-adjusted return</h3>
            <p>Sharpe-ratio optimization</p>
          </div>
          <div>
            <span>02 / Bear</span>
            <h3>Downside protection</h3>
            <p>Conditional Value-at-Risk</p>
          </div>
          <div>
            <span>03 / Stable</span>
            <h3>Index replication</h3>
            <p>Tracking-error minimization</p>
          </div>
        </div>
      </div>
      <div className="capstone-output">
        <div>
          <strong>523</strong>
          <span>Bonds in the archived allocation output</span>
        </div>
        <div>
          <strong>3</strong>
          <span>Regime-specific objectives</span>
        </div>
        <div>
          <strong>2</strong>
          <span>Allocation dates in the saved comparison</span>
        </div>
      </div>
      <details className="capstone-notes">
        <summary>
          Inside the project <ArrowUpRight size={18} />
        </summary>
        <p>
          The implementation compares single-period and multi-period allocation,
          incorporating duration targets and turnover controls. The saved
          comparison contains weight tables for December 2021 and January 2022.
          Portfolio return calculations in that notebook use model-estimated
          returns; the outputs describe an optimization study, not
          realized portfolio performance.
        </p>
        <p>
          The deliverables include a bond-data pipeline, term-structure
          calibration, regime-specific optimizers, comparison notebooks, and a
          Streamlit interface.
        </p>
      </details>
      <Link className="capstone-next" href="/equity-macro-research">
        Explore equity & macro research <ArrowUpRight size={17} />
      </Link>
    </section>
  );
}
