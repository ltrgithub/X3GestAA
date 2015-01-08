using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.TeamHelper
{
    public class TeamItem
    {
        private string _description;
        private string _teamJson;

        public TeamItem(string description, string teamJson)
        {
            _description = description;
            _teamJson = teamJson;
        }

        public string Description
        {
            get { return _description; }
        }

        public string TeamJson
        {
            get { return _teamJson; }
        }
    }
}
