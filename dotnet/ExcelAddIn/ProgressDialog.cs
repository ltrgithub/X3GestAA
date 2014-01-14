using System;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public partial class ProgressDialog : Form
    {
        int rowsDone = 0;

        public ProgressDialog()
        {
            InitializeComponent();
            this.progressBar.Minimum = 0;
            this.progressBar.Maximum = 1;
        }

        internal void SignalRowDone()
        {
            try
            {
                this.rowsDone++;
                progressBar.Value = this.rowsDone;
                progressBar.Refresh();
            } catch (Exception) {}
        }

        internal void SetRowsExpected(int rowsToFill)
        {
            try {
                this.progressBar.Maximum = rowsToFill;
                this.rowsDone = 0;
            }
            catch (Exception) { }
        }
    }
}
