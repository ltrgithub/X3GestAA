using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.ActivityCodeHelper
{
    public class ActivityCodeItem
    {
        private string _description;
        private string _codeact;

        public ActivityCodeItem(string description, string codeact)
        {
            if (description.Equals(String.Empty) && codeact.Equals(String.Empty))
            {
                _description = description;
            }
            else
            {
                _description = codeact + ": " + description;
            }
            _codeact = codeact;
        }

        public string Description
        {
            get { return _description; }
        }

        public string Codeact
        {
            get { return _codeact; }
        }
    }
}
